// Standalone Express server for the site.
//
//  - POST /contact                  existing contact-form email relay (unchanged)
//  - POST /create-checkout-session  builds a Stripe Checkout Session from a cart
//                                    and returns its hosted URL
//  - POST /webhook                  Stripe webhook endpoint — verifies the request
//                                    signature before trusting that a payment
//                                    actually succeeded (this is the "verification"
//                                    step: never trust the browser redirect alone)
//
// Setup:
//   1. cp .env.example .env
//   2. fill in EMAIL_USER / EMAIL_PASS, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   3. npm install
//   4. npm start
//   5. in a second terminal, forward Stripe events to your local server while developing:
//        stripe listen --forward-to localhost:5000/webhook
//      (the CLI prints a webhook signing secret — put that in STRIPE_WEBHOOK_SECRET)

import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;
const TO_EMAIL = process.env.CONTACT_TO_EMAIL || process.env.EMAIL_USER;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:4321";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

// Server-side price list — the browser only ever sends product ids + quantities,
// never prices, so a tampered client request can't change what gets charged.
const PRODUCTS = {
  miniature: { name: "Custom Miniature Sculpture", description: "Hand-sculpted keepsake, ~4-6in tall.", unitAmount: 8500 },
  keychain: { name: "Custom Keychain", description: "Pocket-sized sculpted likeness on a keyring.", unitAmount: 3500 },
  capybara: { name: "Custom Capybara Sculpture", description: "Fully custom pose and colours.", unitAmount: 6500 },
};
const GIFT_BOX_UNIT_AMOUNT = 800;

app.use(cors());

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

    // This event is cryptographically verified by Stripe, so it is the
    // trustworthy signal that payment actually succeeded. Fulfillment
    // (order emails, inventory, etc.) should happen from here, not from
    // the /checkout/success page the customer's browser lands on.
    try {
      await transporter.sendMail({
        from: TO_EMAIL,
        to: TO_EMAIL,
        subject: `New paid order — ${session.id}`,
        html: `<p>Stripe checkout session: ${session.id}</p>
               <p>Amount paid: ${((session.amount_total ?? 0) / 100).toFixed(2)} ${(session.currency ?? "usd").toUpperCase()}</p>
               <p>Customer email: ${session.customer_details?.email ?? "n/a"}</p>
               <p>Payment status: ${session.payment_status}</p>`,
      });
    } catch (mailError) {
      console.error("Order notification email failed:", mailError);
    }
  }

  res.json({ received: true });
});

app.use(express.json());

app.post("/contact", async (req, res) => {
  const { firstName = "", lastName = "", email = "", phone = "", message = "" } = req.body ?? {};

  if (!email || !message) {
    return res.status(400).json({ code: 400, status: "Missing required fields" });
  }

  const mail = {
    from: `${firstName} ${lastName}`.trim() || email,
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

// --- Stripe Checkout session -----------------------------------------------
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items = [], giftBox = false } = req.body ?? {};

    const line_items = [];
    for (const entry of Array.isArray(items) ? items : []) {
      const product = PRODUCTS[entry?.id];
      const quantity = Number.parseInt(entry?.quantity, 10);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) continue;

      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: product.name, description: product.description },
          unit_amount: product.unitAmount,
        },
        quantity,
      });
    }

    if (giftBox && line_items.length > 0) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Gift box packaging" },
          unit_amount: GIFT_BOX_UNIT_AMOUNT,
        },
        quantity: 1,
      });
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
