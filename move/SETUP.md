# Stripe checkout — how to wire this in

These files add a real checkout flow to the existing Astro project,
modeled on the multi-step "get a quote → pay" pattern at talegazers.com/order,
but simplified to a single order page since this shop's catalog is small.

## What's here

```
src/pages/checkout.astro            order form: pick pieces + quantities, live total
src/pages/checkout/success.astro    shown after a successful Stripe payment
src/pages/checkout/cancel.astro     shown if the customer backs out of Stripe
server/index.mjs                    adds /create-checkout-session and /webhook
server/package.json                 adds the "stripe" dependency
server/.env.example                 adds the Stripe env vars (merge with your existing one)
```

## How the "Stripe verification" works

1. `checkout.astro` collects product ids + quantities only (no prices — prices
   live server-side in `PRODUCTS` inside `server/index.mjs`, so a tampered
   request from the browser can't change what's charged).
2. It POSTs the cart to `POST /create-checkout-session`, which asks Stripe to
   create a **Checkout Session** and returns Stripe's hosted payment page URL.
3. The browser is redirected to that Stripe-hosted page. Card entry, address
   collection, and 3D Secure / SCA verification all happen on stripe.com —
   your server never touches raw card numbers.
4. Stripe redirects back to `/checkout/success` or `/checkout/cancel`. That
   redirect is just for UX — it is **not** proof the payment succeeded.
5. In parallel, Stripe calls `POST /webhook` on your server with a signed
   event. `server/index.mjs` verifies that signature with
   `stripe.webhooks.constructEvent(...)` before trusting it. Only after that
   verification does it treat `checkout.session.completed` as a real, paid
   order (currently: sends you a notification email — extend this to write
   to a database, trigger fulfillment, etc.).

This split (redirect page vs. verified webhook) is the standard, secure
pattern — it protects against someone hitting `/checkout/success` directly
without ever paying.

## Setup

```bash
cd server
npm install                 # pulls in the new "stripe" dependency
cp .env.example .env        # merge with your existing .env if you already have one
```

Fill in `server/.env`:
- `STRIPE_SECRET_KEY` — Stripe Dashboard → Developers → API keys (use a **test** key while developing, e.g. `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` — see below
- `CLIENT_URL` — `http://localhost:4321` locally, your real domain in production

Start the server as usual:

```bash
npm start
```

### Testing webhooks locally

Stripe needs to reach your webhook endpoint, which `localhost` isn't
reachable from the internet for. Use the Stripe CLI while developing:

```bash
stripe listen --forward-to localhost:5000/webhook
```

It prints a `whsec_...` value the first time you run it — put that in
`STRIPE_WEBHOOK_SECRET`. In production, create the webhook endpoint in the
Stripe Dashboard instead (Developers → Webhooks → Add endpoint, pointing at
`https://your-server-domain/webhook`, subscribed to
`checkout.session.completed`) and use the signing secret it gives you.

### Test payments

With a test-mode `STRIPE_SECRET_KEY`, use Stripe's test card `4242 4242 4242
4242`, any future expiry, any CVC, any ZIP.

## Optional nav link

Add a link to the new page wherever makes sense, e.g. in
`src/components/Nav.astro`:

```astro
const links = [
  { href: "#home", label: "Home" },
  { href: "#products", label: "Products" },
  { href: "#process", label: "Process" },
  { href: "#connect", label: "Connect" },
  { href: "/checkout", label: "Order" },
];
```

and similarly in `src/components/Footer.astro`'s `footer-links`.
