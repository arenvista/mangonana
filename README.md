# Mangonanas Miniatures — Astro rebuild

A ground-up rebuild of the original Create React App portfolio as an
[Astro](https://astro.build) + TypeScript site, styled after the
editorial, scroll-driven feel of [wodniack.dev](https://wodniack.dev) and
[nodcoding.com](https://nodcoding.com): bold serif display type, generous
whitespace, and content that reveals itself as you scroll — while keeping
the shop's own warm paper / deep plum / aged gold palette and all of its
original copy and sections.

## What changed vs. the original

- **Framework**: Create React App (client-side React Router) → Astro,
  server-rendered `.astro` components with small islands of vanilla
  TypeScript only where interactivity is needed (nav, hero word-rotator,
  reviews carousel, contact form, scroll-reveal).
- **Styling**: Bootstrap + custom CSS → a single token-driven
  `src/styles/global.css`, no CSS framework dependency.
- **Animation**: every major section fades/slides into view on scroll via
  a small `IntersectionObserver` utility (`src/lib/reveal.ts`), with a
  subtle parallax on the hero/contact art panels. Everything
  respects `prefers-reduced-motion`.
- **Security**: the original `server.js` had a Gmail app password
  hardcoded in source. The rebuilt `server/index.mjs` reads credentials
  from environment variables (`server/.env.example`) instead — copy it to
  `.env` and fill in your own credentials before using it.
- **Pages**: `/` (homepage) and `/resume` (standalone CV page, no
  nav/footer, print-friendly), matching the two routes in the original
  `App.js`.

## Structure

```
src/
  components/   One .astro component per homepage section
  layouts/      Shared <head> + global script bootstrap
  lib/          reveal.ts — scroll-reveal / parallax / nav-scroll helpers
  pages/        index.astro, resume.astro
  styles/       global.css — design tokens + base styles
public/         favicon, robots.txt
server/         optional standalone Express API for the contact form
```

## Getting started

```bash
npm install
npm run dev       # http://localhost:4321
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

### Contact form backend (optional)

The contact form posts to `http://localhost:5000/contact`, matching the
original project's separate Express server. To run it:

```bash
cd server
npm install
cp .env.example .env   # then fill in EMAIL_USER / EMAIL_PASS / CONTACT_TO_EMAIL
npm start
```

If you deploy the API elsewhere, update the `fetch()` URL in
`src/components/Contact.astro`.
