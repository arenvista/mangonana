// Standalone Express server for the site.
//
//  - POST /contact                  contact-form email relay
//  - POST /custom-order             custom-quote request (multipart w/ image) → email
//  - POST /create-checkout-session  builds a Stripe Checkout Session from a cart
//                                    and returns its hosted URL
//  - POST /webhook                  Stripe webhook endpoint — verifies the request
//                                    signature before trusting that a payment
//                                    actually succeeded (never trust the browser
//                                    redirect alone)
//
// Setup:
//   1. cp .env.example .env
//   2. fill in EMAIL_USER / EMAIL_PASS, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   3. npm install
//   4. npm start
//   5. in a second terminal while developing:
//        stripe listen --forward-to localhost:5000/webhook

import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import multer from "multer";
import Stripe from "stripe";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;
const TO_EMAIL = process.env.CONTACT_TO_EMAIL || process.env.EMAIL_USER;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:4321";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("⚠ STRIPE_SECRET_KEY is not set — checkout will fail until you add it to .env");
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

// ---------------------------------------------------------------------------
// Server-side price list — SOURCE OF TRUTH.
// Keep in sync with src/lib/catalog.ts (that copy is display-only).
// The browser only ever sends ids / sizes / booleans, never prices, so a
// tampered client request can't change what gets charged.
// ---------------------------------------------------------------------------
const CATALOG = {
  pikachu:   { name: "Pikachu",          basePrice: 5500, blurb: "Classic pose, hand-painted cheeks." },
  charizard: { name: "Charizard",        basePrice: 7500, blurb: "Wings spread, flame-tail detail." },
  eevee:     { name: "Eevee",            basePrice: 5000, blurb: "Soft-sculpted fur texture." },
  totoro:    { name: "Totoro",           basePrice: 6000, blurb: "Big-bellied forest spirit." },
  "no-face": { name: "No-Face",          basePrice: 5800, blurb: "Matte mask, subtle iridescence." },
  calcifer:  { name: "Calcifer",         basePrice: 4800, blurb: "Translucent resin flame effect." },
  capybara:  { name: "Capybara",         basePrice: 6500, blurb: "Because everyone needs a capybara." },
  corgi:     { name: "Corgi Pup",        basePrice: 5500, blurb: "Stubby legs, big ears, full send." },
  dragon:    { name: "Baby Dragon",      basePrice: 7000, blurb: "Curled tail, hand-glazed scales." },
};
const SIZE_DELTAS = { Small: 0, Medium: 1500, Large: 3500 };
const KEYCHAIN_ADDON = 1200; // per unit, cents
const GIFT_WRAP_ADDON = 800; // per unit, cents
const MAX_QTY = 20;

app.use(cors({ origin: CLIENT_URL })); // only the Astro site may call this API

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("Mail transport not ready:", error.message);
  } else {
    console.log("Mail transport ready.");
  }
});

// --- Stripe webhook -------------------------------------------------------
// Registered BEFORE express.json() and uses express.raw() instead, because
// Stripe's signature check needs the exact raw request body bytes.
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Webhook signature verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Cryptographically verified by Stripe → the trustworthy signal that
    // payment actually succeeded. Fulfillment happens from here, not from
    // the /checkout/success page the customer's browser lands on.
    try {
      const shipping = session.shipping_details ?? session.customer_details;
      await transporter.sendMail({
        from: TO_EMAIL,
        to: TO_EMAIL,
        subject: `New paid order — ${session.id}`,
        html: `<p>Stripe checkout session: ${session.id}</p>
               <p>Amount paid: ${((session.amount_total ?? 0) / 100).toFixed(2)} ${(session.currency ?? "usd").toUpperCase()}</p>
               <p>Customer email: ${session.customer_details?.email ?? "n/a"}</p>
               <p>Ship to: ${shipping?.name ?? "n/a"}, ${JSON.stringify(shipping?.address ?? {})}</p>
               <p>Order summary: ${session.metadata?.order_summary ?? "n/a"}</p>
               <p>Payment status: ${session.payment_status}</p>`,
      });
    } catch (mailError) {
      console.error("Order notification email failed:", mailError);
    }
  }

  res.json({ received: true });
});

app.use(express.json());

// --- Contact form ----------------------------------------------------------
app.post("/contact", async (req, res) => {
  const { firstName = "", lastName = "", email = "", phone = "", message = "" } = req.body ?? {};

  if (!email || !message) {
    return res.status(400).json({ code: 400, status: "Missing required fields" });
  }

  const mail = {
    from: process.env.EMAIL_USER, // Gmail rejects arbitrary "from" addresses
    replyTo: email,
    to: TO_EMAIL,
    subject: "Contact Form Submission - Mangonanas Miniatures",
    html: `<p>Name: ${firstName} ${lastName}</p>
           <p>Email: ${email}</p>
           <p>Phone: ${phone}</p>
           <p>Message: ${message}</p>`,
  };

  try {
    await transporter.sendMail(mail);
    res.json({ code: 200, status: "Message Sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ code: 500, status: "Failed to send message" });
  }
});

// --- Custom order (quote request with reference image) ---------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB, matches the client-side check
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype));
  },
});

app.post("/custom-order", upload.single("image"), async (req, res) => {
  const { name = "", email = "", notes = "" } = req.body ?? {};

  if (!name.trim() || !email.trim() || !notes.trim()) {
    return res.status(400).json({ error: "Please fill in your name, email, and details." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Please attach a reference image (PNG, JPG, or WEBP)." });
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      replyTo: email,
      to: TO_EMAIL,
      subject: `Custom order request — ${name}`,
      html: `<p>Name: ${name}</p>
             <p>Email: ${email}</p>
             <p>Notes: ${notes}</p>`,
      attachments: [
        {
          filename: req.file.originalname || "reference-image",
          content: req.file.buffer,
          contentType: req.file.mimetype,
        },
      ],
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("Custom order email failed:", error);
    res.status(500).json({ error: "Could not send your request. Please try again." });
  }
});

// Multer errors (file too large, wrong type) land here
app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "That image is over 15MB — please choose a smaller file." : "Invalid file upload.";
    return res.status(400).json({ error: message });
  }
  next(err);
});

// --- Stripe Checkout session -----------------------------------------------
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items = [] } = req.body ?? {};

    const line_items = [];
    const summaryParts = [];

    for (const entry of Array.isArray(items) ? items : []) {
      const item = CATALOG[entry?.id];
      const sizeDelta = SIZE_DELTAS[entry?.size];
      const quantity = Number.parseInt(entry?.quantity, 10);

      // Reject anything that isn't a known item, known size, and sane quantity.
      if (!item || sizeDelta === undefined || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
        continue;
      }

      const keychain = entry?.keychain === true;
      const giftWrap = entry?.giftWrap === true;
      const unit_amount = item.basePrice + sizeDelta + (keychain ? KEYCHAIN_ADDON : 0) + (giftWrap ? GIFT_WRAP_ADDON : 0);

      const options = [keychain && "keychain mount", giftWrap && "gift wrapped"].filter(Boolean).join(", ");
      const name = `${item.name} (${entry.size})${options ? ` — ${options}` : ""}`;

      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name, description: item.blurb },
          unit_amount,
        },
        quantity,
      });
      summaryParts.push(`${quantity}× ${name}`);
    }

    if (line_items.length === 0) {
      return res.status(400).json({ error: "No valid items were selected." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "NZ", "IE", "DE", "FR", "ES", "IT", "NL"],
      },
      // Stripe metadata values max out at 500 chars
      metadata: { order_summary: summaryParts.join("; ").slice(0, 500) },
      success_url: `${CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/checkout/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    res.status(500).json({ error: "Could not start checkout. Please try again." });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
