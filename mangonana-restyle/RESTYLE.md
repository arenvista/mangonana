# Restyle v2 — "clay & pastel" (nodcoding.com direction)

Extract over the project root. These files **replace** their old counterparts.

## The design direction

nodcoding.com (built by studio Waaark) = flat playful illustration, big friendly
type, soft pastel section blocks, marquees, stacked sticky panels, review pills.
Your palette maps onto it like so:

| Color | Role |
|---|---|
| `#F6C992` peach | warm surfaces, hero wash, marker highlight, footer/CTA accents |
| `#30525C` slate | ink, borders, dark bands (marquee, CTA panel, footer) |
| `#ACC0D3` powder | alt section backgrounds, muted text on dark |
| `#D396A6` rose | secondary accent — blob mascots, cart-badge flash, hover states |
| `#09A1A1` teal | **primary action color** — buttons, links, prices, focus rings |
| `#5484A4` steel | tertiary — tone-3 product swatches, small shapes |

Type swapped from serif/mono to **Bricolage Grotesque** (display, 600–800) +
**Instrument Sans** (body) + **Space Mono** (labels) — loaded in `Layout.astro`.

**Signature element:** the clay-blob mascot in the hero — a morphing
`border-radius` blob (clay being kneaded) with blinking CSS eyes, blush cheeks,
and a stitched smile. A smaller sibling peeks over the CTA panel.

## How the rest of the site restyles itself

`global.css` aliases every v1 token to the new system (`--plum → teal`,
`--gold → rose`, `--serif → display`, `--paper-3 → powder`, etc.), so
**checkout, success/cancel, custom-order, and confirmation pages adopt the new
palette with zero edits**. The old plum/gold product-swatch gradients on the
catalog and checkout pages are overridden globally to flat clay pastels
(rose / peach / steel with a soft top-light).

## New files

- `src/styles/global.css` — full v2 token system + aliases + reveal engine + shared keyframes
- `src/layouts/Layout.astro` — new fonts, theme color, boots reveals + count-ups
- `src/lib/reveal.ts` — `initScrollState`, `initReveals`, `initCountUps` (same exports, so Nav keeps working)
- `src/pages/index.astro` — rebuilt homepage
- Components: `Hero`, `Marquee`, `WhyUs`, `Featured`, `Process`, `Reviews`, `CustomCta`, `Contact`, `Nav`, `Footer`

Nav/Footer keep every id and behavior from the checkout work (`nav-cart-count`,
`cart:updated` bump, menu toggle), and `Contact` still posts the same field
names to `POST /contact`.

## Animation inventory (all disabled under `prefers-reduced-motion`)

**Hero (page-load orchestration):** headline lines mask-reveal with a clay-like
overshoot → peach marker swipes behind "big" → sub + buttons fade-rise, all on a
stagger. Mascot morphs + floats + blinks every ~4s; confetti minis drift; the
circular "handmade with clay • one of one" badge rotates (pauses on hover).

**Scroll:** reveal system with five variants — rise, `scale`, `left`, `right`,
and new `pop` (squash-in with a tilt) — plus per-element stagger via
`--reveal-delay`. Stat pills **count up** when they enter view. The process
section is the nodcoding homage: **sticky stacking panels** that deal over each
other as you scroll (pure CSS `position: sticky`, offset per card).

**Ambient:** dark marquee band under the hero (pausable), two
**counter-drifting testimonial marquees** (hover to pause and read), wave SVG
dividers into the marquee and footer, morphing blobs in section corners.

**Micro:** buttons lift on hover and *squish* on press (`--ease-squash`
overshoot curve); sticker cards shift their hard offset shadows; featured cards
**3D-tilt toward the pointer** (mouse-only); nav logo/social blobs wiggle;
inputs scale 1% on focus; cart badge bump now flashes rose; eyebrow dots pulse.

## Contrast notes

Teal on white is used only for large/bold text and UI chrome; body text stays
slate on paper (≈9:1). The teal process panel uses white text at 700 weight.
