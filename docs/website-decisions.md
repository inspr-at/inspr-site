# inspr.at — website decisions log

Append-only. Every reversible decision and irreversible commitment for the
inspr.at v1 redesign. New entries go at the bottom with a date and rationale.

This document is the durable artifact: PPM tickets close, transcripts get
compacted, but this stays.

PPM home epic: **INSPR-88** *(Discovery & direction)*. Tickets referenced
inline.

---

## D-001 — Audience priority

**Date:** 2026-05-03
**Ticket:** INSPR-91
**Status:** Committed (operator may revise)

The primary visitor frame is the **senior operator / OSS contributor /
engineering leader** — the visitor who can read the Agent Contract on its
own terms and evaluate the architecture rigour. They are the multiplier
audience: each one brings a team or a household into the orbit later.

Less-technical onboarding (the family-grade end of the user spectrum) is
served by a clearly-named secondary path, not by the home page's centre of
gravity.

**Why:** the architecture doc is the differentiator. A landing that hides it
behind toy-grade marketing copy buries the lede. A landing that leads with
it filters in the people who can carry the platform forward and signals to
everyone else that there is real substance underneath.

**How to apply:** every section's primary read is to the operator; every
section's secondary read should still be intelligible to someone who isn't
one. No section is operator-only.

---

## D-002 — Stack & CSP posture

**Date:** 2026-05-03
**Ticket:** INSPR-92
**Status:** Updated; deployment details superseded by D-008

- **Stack:** Astro 5 SSG. Source lives in `web/`; build output goes to
  `web/dist/` and is promoted as an immutable release under D-008. It is never
  copied into the frozen `site/` archive.
- **JS posture:** `script-src 'self'` (relaxed from current `'none'`). Used
  only for cross-document View Transitions and one tasteful hero island.
  Everything else works with JS off — including all motion (scroll-driven
  CSS animations, View Transitions, `@property` typed transitions).
- **No external CDN at runtime.** Fonts self-hosted via `@fontsource[-variable]`,
  inlined into the build. No Google Fonts hotlink, no analytics CDN.

**Why:** Astro 5 is the strongest static-content framework in 2026 — best
output, partial hydration when needed, native View Transitions support, and
honest perf out of the box. `script-src 'self'` is the smallest CSP
relaxation that still admits the modern motion vocabulary; it remains
strictly defensive.

---

## D-003 — Deploy posture

**Date:** 2026-05-03
**Ticket:** INSPR-93
**Status:** Updated; release mechanics superseded by D-008

Keep the existing **Caddy + docker-compose** stack on csb1, fronted by
Traefik. The `inspr-www` service mounts the immutable `./releases` tree at
`/srv/releases:ro` and the frozen `./site` archive at `/srv/v1:ro`. A release
changes the `releases/current` symlink transactionally; it does not mutate the
archive, container or network.

**Why:** the existing infra works, is declarative, and is documented across
the playbook (csb1, Headscale tailnet, Traefik routing). Replacing it would
be an unrelated risk for an unrelated reward.

---

## D-004 — Aesthetic direction

**Date:** 2026-05-03
**Ticket:** INSPR-94
**Status:** Committed

**One sentence:** *editorial archive meets engineering log.*

- **Mode:** dual (cream daylight + ink-dark), auto-switched via
  `prefers-color-scheme`. Both modes share type, motion, and layout — only
  the colour tokens swap.
- **Type:** Fraunces Variable (display, axes: `opsz`, `wght`, `SOFT`,
  `WONK`) + Inria Sans (body, 300/400/700 + italic) + JetBrains Mono
  Variable (engineering-log marginalia). All OFL, all self-hosted. No
  Inter, Geist, or Space Grotesk.
- **Colour:** OKLCH-native palette with sRGB fallback. P3 ember accent
  rendered via `display-p3` for wide-gamut displays (Studio Display,
  ProDisplay XDR, iPhone, iPad, MBP).
- **Motion:** CSS-only. Scroll-driven keyframes via
  `animation-timeline: view()`, cross-document View Transitions, typed
  transitions on font-variation axes via `@property`. Every motion has a
  reduced-motion fallback that still communicates intent.
- **Layout:** asymmetric editorial grid via CSS Subgrid; fluid type with
  `clamp()` and container-relative `cqi`; container queries throughout.
  At most one viewport-level layout shift; everything else adapts to its
  container, which means the page holds at 320 px and at 32-inch 6 K with
  the same rules.

**Why this and not "another Apple page":** Apple's restraint is generic —
every product gets the same treatment. INSPR's content is *principled*,
not *promotional*. Editorial typography honours that. It also lets us
out-Apple Apple on the one axis Apple actually owns — typographic
confidence and rhythm — by being more deliberate, not louder.

---

## D-005 — Scope of v1

**Date:** 2026-05-03
**Ticket:** (implicit — sets boundaries for INSPR-110+)
**Status:** Committed

A **single editorial scroll** for v1: hero → mission → pluralism → Agent
Contract → artifacts → audience spectrum → footer. No other pages on
launch day. Future depth (e.g., a `/architecture` reading edition that
ports `architecture.md`, or `paimos.inspr.at`) ships after launch.

**Why:** one page perfected beats four pages adequate. The cross-document
View Transitions infrastructure goes in regardless, so the second page is
cheap when we get to it.

---

## D-006 — Repo layout

**Date:** 2026-05-03
**Ticket:** INSPR-89
**Status:** Updated; deployment details superseded by D-008

```
inspr-at/
  Caddyfile          (host routing and security headers)
  docker-compose.yml (runtime boundary)
  deploy.sh          (transactional release entry point)
  site/              (frozen pre-relaunch archive for v1.inspr.at)
  web/               Astro source
  web/dist/          (build output, gitignored)
  docs/              durable artifacts (this file)
```

**Why:** application source, immutable build output and the historical archive
have distinct responsibilities. `site/` is no longer a deployment target; it
remains frozen for `v1.inspr.at`. Current releases are built from `web/` and
promoted transactionally as described in D-008.

---

## D-007 — Voice

**Date:** 2026-05-03
**Ticket:** (informs INSPR-110 onwards)
**Status:** Committed

- Principled, calm, unbranded. No marketing register. No idiom that lands
  ambiguously for non-native readers (per the playbook field-note on
  "drop a file" / "spin up").
- The architecture doc's tone, distilled. If a sentence wouldn't survive
  a cold read by a senior operator, it doesn't ship.
- No filler CTAs. Every link goes somewhere real.

---

## D-008 — Deploy ritual

**Date:** 2026-05-13
**Ticket:** INSPR-177
**Status:** Committed

Deploy is **one command**: `./deploy.sh` from the repository root. Production
deployment requires a clean Git tree and gives the build one truthful release
identity: UTC deployment time, Git revision and immutable release ID.

Pipeline:

1. Build the Astro site into `web/dist/`, then run the hero-loop media,
   section-pattern and CSP checks. The build writes its allowlisted release
   facts to `web/dist/release.json`.
2. Verify the local frozen archive exists. Verify the remote archive exists
   before any upload begins.
3. Upload `web/dist/` into an unreachable `releases/.incoming-<id>` directory,
   confirm checksum parity and move it into `releases/builds/<id>` only after
   validation succeeds.
4. Publish new content-addressed Astro assets into the append-only
   `releases/assets/` pool before switching HTML. Existing asset names are never
   overwritten, so cached pages and retained releases keep their dependencies.
5. Stage and validate changed Caddy or Compose configuration. Snapshot the
   currently active configuration for automatic rollback before promoting it.
6. Atomically switch `releases/current` to the sealed build. Validate Caddy and
   the umbrella page inside the container, then probe all public hostnames,
   security headers, redirects, identity routes and a shared product asset.
7. Only after all probes pass, point `releases/previous` at the former healthy
   build. A failed promotion restores the prior content symlink and routing
   configuration; every sealed build remains available for an explicitly
   selected rollback.

`site/` is the frozen pre-relaunch archive served only at `v1.inspr.at`. It is
never a build target, mirror target or deployment target. In particular, never
copy `web/dist/` over `site/` and never use `rsync --delete` against the local or
remote archive.

**Why a push-based script (and not git-pull-on-host):** the remote
`/home/mba/docker/inspr-at/` is a flat directory, not a git checkout.
Making it a checkout adds a deploy-key materialization + a "what if
local and remote drift?" failure mode for negligible benefit — build
artifacts have to land there either way. Push-based rsync from one
machine keeps the deploy surface tiny. `inspr.nixos.pull-on-host`
(INSPR-176) is the right answer once the pattern shows up on a second
host; for inspr.at alone, a script is the right grain.

**Why immutable releases:** promotion changes one symlink instead of mutating
the served tree. The previous healthy HTML remains present, old hashed assets
remain addressable, and a failed release can be reversed without reconstructing
files from deployment history. Caddy's admin API remains bound to a Unix socket
inside its private configuration volume; no TCP admin surface is exposed.

---

## D-009 — Paimos Specs section interaction model

**Date:** 2026-07-23
**Ticket:** paimos PAI-691 (site sync)
**Status:** Committed

The Specs grid is 20 flip-cards in fixed 5/4/2 columns (always a full
rectangle), randomized per load. Group identity is carried by **icon color
only** (security / ops / AI / legal / work / place) — face tints were tried
and rejected as noise. Click anywhere on a card flips and pins it; hover
previews; Esc releases; controls (ELI10 mode, Flip all, hidden ⤨ shuffle)
are styled like the site nav — words, no chrome.

Two reading layers: the technical note and an **ELI10 variant** aimed at
non-IT buying centers, toggled per section. Buzzwords in notes are
hover-only terms: a yellow marker lights the word and a bare, frameless
live-help line under the grid shows the definition. The expandable glossary
panel was built and then deliberately removed — hover-help everywhere beat
a lookup box nobody opens. Terms carry their definitions as `data-def`;
there is no hidden glossary DOM.

**Why:** the grid must work for two audiences at once without doubling the
page, and every interaction should have exactly one meaning (click = flip).

---

## D-010 — PhotoSwipe for the product-view lightbox

**Date:** 2026-07-23
**Ticket:** paimos PAI-694
**Status:** Committed

The hand-rolled `<dialog>` lightbox (chip buttons, custom nav) read dated
and its controls never sat right. Replaced with **PhotoSwipe 5** — MIT,
self-hosted via npm, bundled by Astro into hashed modules so `script-src
'self'` covers it with zero CSP changes and zero external requests.
Fancybox/lightGallery were rejected on license (GPL/commercial). Captions
come from `data-caption` via the documented uiRegister element; thumbnails
are progressive-enhancement `<a>`s to the full rendition. Page blur behind
the lightbox stays ours (`body.lightbox-open > :not(.pswp)`).

**Why:** image lightboxes are a solved problem; the default high-quality
tool beats bespoke chrome. Future video cards should use PhotoSwipe's
custom-content path, not a second lightbox.

---

## D-011 — public/ scripts always carry a release-id cache-buster

**Date:** 2026-07-23
**Ticket:** — (incident-driven)
**Status:** Committed (rule)

Incident: a deploy shipped fresh HTML while the 5-minute edge cache served
the previous `/scripts/specs-pin.js` — every new control was dead on the
live site, while local builds passed QA. Unlike `_astro/*`, `public/`
scripts are not content-fingerprinted.

Rule: every `<script src="/scripts/...">` reference must append
`?v=${INSPR_RELEASE_ID}` so script and HTML bust caches atomically with
the release. Corollary: behavioral QA runs against the **live site** after
deploy, not only against the local dist.

---

## D-012 — Root reserves the scrollbar gutter

**Date:** 2026-07-23
**Ticket:** —
**Status:** Committed

`html { scrollbar-gutter: stable }`. Modal scroll-locks (`overflow:
hidden`) no longer change viewport width, so lightbox open/close cannot
shift the page. Accepted trade: classic-scrollbar users always see the
gutter. This replaces the legacy JS padding-compensation hack for every
current and future modal.

---

## D-013 — Product imagery provenance

**Date:** 2026-07-23
**Ticket:** paimos PAI-695, PAI-696
**Status:** Committed (rule)

All Paimos interface imagery is captured from the **current build's seeded
demo workspace** (dev stack, dev banners hidden), never from a production
instance — production screenshots would put real customer data on a public
page. Every capture states its provenance in the caption ("Demo workspace,
Paimos vX.Y.Z"). The annotated workbench capture has a framing contract
(TASKS heading at top, 1600x1000@2x) that the three hotspot positions are
tuned to; re-measure when the capture changes. Refresh pipeline:
paimos PAI-695.
