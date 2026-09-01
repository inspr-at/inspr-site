# inspr.at — design system

The single durable artifact for tokens and primitives the v1 site is built
on. Every section consumes these tokens; nothing in the components hard-codes
a value. Companion to [`website-decisions.md`](./website-decisions.md).

PPM home epic: **INSPR-96**.

---

## 1 · Type

Three families. All variable, all OFL, all self-hosted via
`@fontsource[-variable]` (no Google Fonts CDN, no privacy leakage).

| Role | Family | Axes used | Source |
|---|---|---|---|
| Display | **Fraunces** | `opsz` (14–144), `wght` (100–900), `SOFT` (0–100), `WONK` (0–1) | `@fontsource-variable/fraunces/full.css` |
| Body | **Inria Sans** | static 300 / 400 / 700 + 400-italic | `@fontsource/inria-sans/{300,400,700,400-italic}.css` |
| Mono | **JetBrains Mono Variable** | `wght` | `@fontsource-variable/jetbrains-mono` |

The two axes of Fraunces we *animate* — `SOFT` and `WONK` — are
registered as typed custom properties in
[`src/styles/typography.css`](../web/src/styles/typography.css) so they
can be transitioned smoothly:

```css
@property --fr-soft { syntax: "<number>"; inherits: true; initial-value: 0; }
@property --fr-wonk { syntax: "<number>"; inherits: true; initial-value: 0; }
```

### Fluid scale

All sizes via `clamp(min, vw-relative, max)` so type scales smoothly from
360 px to 32" 6 K with no manual breakpoints:

| Token | Lower | Upper | Used for |
|---|---|---|---|
| `--t-xs` | 0.78 rem | 0.875 rem | marginalia, mono labels |
| `--t-sm` | 0.9 rem | 1 rem | secondary copy, list items |
| `--t-base` | 1.04 rem | 1.18 rem | body |
| `--t-lg` | 1.18 rem | 1.42 rem | lede paragraphs |
| `--t-xl` | 1.42 rem | 1.85 rem | h3, pivots |
| `--t-2xl` | 1.85 rem | 2.6 rem | h2 |
| `--t-3xl` | 2.4 rem | 3.8 rem | section h2s |
| `--hero` | 3.2 rem | 11 rem | the single hero h1 |

### Fraunces axis presets

| Use | `opsz` | `wght` | `SOFT` | `WONK` |
|---|---|---|---|---|
| Hero (first paint) | 144 | 360 | 0 → 70 (animated) | 0 |
| Hero (hover/focus) | 144 | 360 | 70 | 1 |
| Section h2 | 36 | 420 | 30 | 0 |
| Pull-quote / close | 36 | 380 | 60 | 0 |
| Drop cap | 144 | 380 | 70 | 0 |
| Audience line (start) | 144 | 380 | 90 | 1 |
| Audience line (end of scroll) | 144 | 380 | 0 | 0 |

---

## 2 · Colour

OKLCH-native. Cream daylight + ink-dark, auto-switched via
`prefers-color-scheme`. The only saturation in the system is the **ember
accent**; everything else is greyscale tilted warm.

### Light mode (cream)

| Token | OKLCH | Notes |
|---|---|---|
| `--surface` | `oklch(96.5% 0.013 80)` | body background |
| `--surface-sunk` | `oklch(94.6% 0.014 78)` | footer |
| `--surface-raised` | `oklch(98.4% 0.010 84)` | convergence diagram, code |
| `--ink` | `oklch(20% 0.012 50)` | primary text |
| `--ink-soft` | `oklch(36% 0.010 52)` | secondary text |
| `--ink-dim` | `oklch(58% 0.008 60)` | marginalia |
| `--line` | `oklch(82% 0.010 70)` | rules, borders |
| `--ember` | `oklch(64% 0.18 38)` | accent |
| `--ember-strong` | `oklch(58% 0.20 36)` | drop cap, pivot title |

### Dark mode (ink)

| Token | OKLCH | Notes |
|---|---|---|
| `--surface` | `oklch(13% 0.010 60)` | carbon |
| `--ink` | `oklch(92% 0.014 80)` | bone (primary text) |
| `--ember` | `oklch(70% 0.17 40)` | brighter ember for dark |

### Wide-gamut

OKLCH is wide-gamut by spec. On P3-capable displays (Studio Display,
ProDisplay XDR, every iPhone/iPad/MBP since 2017) the ember sits clearly
outside sRGB and reads as a richer ember. Outside P3 the value is gamut-
mapped to the sRGB approximation by the browser (no manual fallback
needed in modern browsers).

### Selection

```css
::selection {
  background-color: oklch(from var(--accent) l c h / 0.28);
  color: var(--text);
}
```

`oklch(from ...)` keeps the selection tied to whatever the current
accent value is — the `0.28` opacity stays consistent across modes.

---

## 3 · Spacing & rhythm

| Token | Value |
|---|---|
| `--measure` | `62ch` (reading column) |
| `--measure-wide` | `84ch` (head + lede) |
| `--gutter` | `clamp(1.25rem, 4cqi, 3rem)` |
| `--rhythm` | `clamp(0.75rem, 1.5cqi, 1.25rem)` |

All sections use `container-type: inline-size` so spacing scales with the
section's *box*, not the viewport. The same component embedded in a
narrower context (a future sidebar, a future card) will reflow correctly
without any media-query rewrite.

---

## 4 · Motion

CSS-only. No JS runs on the page. Three vocabularies:

### a · `@property` typed transitions

For animating font-variation axes and other custom properties that need
interpolation. Declared in
[`src/styles/typography.css`](../web/src/styles/typography.css).

### b · Scroll-driven animations

```css
.reveal-soft {
  animation: soft-fade both;
  animation-timeline: view();
  animation-range: entry 10% entry 90%;
}
```

Supported in Chromium 115+ and Safari 18+. On older browsers the
animation falls back to the document timeline (duration 0s) and snaps to
the endpoint state — visually correct, just instant.

### c · Cross-document View Transitions

```css
@view-transition { navigation: auto; }
```

In `src/styles/motion.css`. Becomes load-bearing when the second page
ships (e.g. `/architecture` reading edition).

### Reduced motion

Every animation collapses to 1 ms; `scroll-behavior: smooth` falls back
to `auto`; the audience-line scroll-driven axis morph short-circuits via
`@supports (animation-timeline: view())` *combined with* the
`prefers-reduced-motion: reduce` 1 ms rule.

---

## 5 · Layout primitives

- **Container queries** everywhere (`container-type: inline-size`). At
  most one viewport-level breakpoint in the entire page (audience line
  font-size).
- **CSS Subgrid** for editorial composition (chapter head + body +
  marginalia in Mission, Pluralism, Agent Contract).
- **Logical properties** throughout (`inline-size`, `block-size`,
  `padding-inline`, `border-block-start`) — RTL-friendly by construction.

---

## 6 · Accessibility

| Concern | Decision |
|---|---|
| Lang | `<html lang="en">` |
| Headings | One `<h1>` (hero); each section starts with `<h2>` linked via `aria-labelledby` |
| Landmarks | `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>` |
| Focus | `:focus-visible` ring at 2 px ember, 3 px offset |
| Contrast | All token pairs verified ≥ WCAG 2.2 AA at all type sizes |
| Reduced motion | Every animation has a 1 ms snap-to-endpoint fallback |
| Decorative content | `aria-hidden="true"` on the convergence pivot, hero mark, footer separator |
| Skip links | Implicit via the `#top` `<main>` anchor (browser jump-to-main) |
| Custom cursor | Only on the hero `h1` (text-cursor on hover). Never on body text. |

---

## 7 · Performance posture

| | Target | Actual (v1 build) |
|---|---|---|
| HTML (gzipped) | < 8 KB | ~6 KB |
| CSS (one bundle, gzipped) | < 12 KB | ~10 KB |
| Fonts (per-script subsets, woff2) | per glyph need | Latin+Lat-Ext+Vi loaded; ~150–200 KB typically used |
| JS runtime | 0 B | 0 B |
| Lighthouse Perf | 100 | (verify at deploy) |
| Lighthouse A11y | 100 | (verify at deploy) |

---

## 8 · CSP posture

Pinned in [`Caddyfile.v1`](../Caddyfile.v1). Highlights:

```
default-src 'self';
style-src 'self' 'unsafe-inline';   # Astro emits scoped <style> blocks
img-src 'self' data:;
font-src 'self';
script-src 'self' 'sha256-...';     # only the inline JSON-LD payload
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

The single inline `<script type="application/ld+json">` is allowed via a
SHA-256 hash, not `'unsafe-inline'`. `web/scripts/verify-csp.py`
recomputes that hash and exits non-zero if it drifts from what's pinned
in Caddyfile.v1 — run as part of pre-deploy.

---

## 9 · How to extend

When adding a new section:

1. Create `web/src/sections/<Name>.astro`.
2. Use the chapter pattern from existing sections (chapter marginalia,
   `<h2 id="...">` linked via `aria-labelledby`, `lede` paragraph).
3. Consume tokens, never raw values.
4. Wrap in `class="reveal-soft"` if it's below-the-fold.
5. Wire into `web/src/pages/index.astro`.
6. Run `npm run build` → `python3 web/scripts/verify-csp.py` →
   manual eyeball.

When adding a new token:

1. Add to `web/src/styles/tokens.css` under both light and dark blocks.
2. Document in this file under the relevant section.
3. Verify contrast for any colour token against the surface tokens.

---

## 10 · Product identity and editorial heroes

Each product row combines a native vector mark with one 16:9 editorial hero.
The canonical sequence is **Aithema, Paimos, Pharos, Janus**. Rows alternate
image-right and image-left on wide screens: Aithema keeps its copy on the left
and visual on the right, followed by Paimos left, Pharos right and Janus left.
The grid column fractions reverse with the content order, so every product hero
retains the same visual width, 16:9 ratio, rounded corners and one-pixel border.
On narrow screens every row returns to the same single-column reading order.

Marks must remain real SVG geometry: a declared `viewBox`, accessible title and
description, no embedded raster image and no text element standing in for a
wordmark. Aithema's mark uses the **Requirement Prism** concept: teal and gold
fields represent diffuse input, a transparent diamond is the resolving
aperture, and the navy diamond is the durable decision object.

Heroes use the shared ivory, glass, marble, teal and restrained gold material
language, but each depicts the product's actual responsibility. Product heroes
make one transformation or operating boundary visible. The existing INSPR
umbrella hero and its matching motion loop are a fixed asset and are not
replaced as part of product-row artwork changes.

Generated artwork is stored under `web/src/assets/products/<slug>/` and served
through Astro's image pipeline. It must contain no generated text, logos,
watermarks or pseudo-interface copy, and its accessible alternative describes
the claim rather than the rendering style.
