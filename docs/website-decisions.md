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
**Status:** Committed

- **Stack:** Astro 5 SSG. Source in `web/`. Build output goes to `web/dist/`
  during development; promoted into `site/` only at launch.
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
**Status:** Committed

Keep the existing **Caddy + docker-compose** stack on csb1, fronted by
Traefik. The `inspr-www` service mounts `./site:/srv:ro` (per
`docker-compose.yml:9`); we change *the contents of `site/`*, not the
mount, the container, or the network.

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
**Status:** Committed

```
inspr-at/
  Caddyfile          (unchanged for now)
  docker-compose.yml (unchanged for now)
  site/              (live placeholder, untouched until launch day)
  web/               NEW — Astro source
  web/dist/          (build output, gitignored)
  docs/              NEW — durable artifacts (this file)
```

**Why:** keeps the live `site/` serving the placeholder for the entire
build phase. Launch is a single replacement of `site/` contents from
`web/dist/`. Lowest-risk cutover possible.

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

Deploy is **one command**: `./deploy.sh` from the repo root.

Pipeline (idempotent, safe to re-run):

1. `cd web && npm run build` — Astro static build into `web/dist/`.
2. `python3 web/scripts/verify-csp.py` — abort if a new inline script
   would violate `script-src` (forces a Caddyfile hash pin BEFORE
   shipping, never after).
3. `rsync -a --delete web/dist/ site/` — local mirror of the build.
4. `rsync -avz --delete site/ csb1:/home/mba/docker/inspr-at/site/` —
   bind-mounted read-only into `inspr-www`, picked up on the next
   request (no reload needed for content changes).
5. If `Caddyfile` differs from remote (SHA-256 compare): `scp` it over,
   then `docker exec inspr-www caddy reload --address
   unix//config/caddy-admin.sock` — **zero-downtime** reload via the
   unix-socket admin API. Falls back to `docker compose restart
   inspr-www` if the socket is unreachable (e.g. the first deploy after
   switching from `admin off`).
6. `curl` probe of `/`, `/v1/`, `/v2/` to confirm the cutover landed.

**Why a push-based script (and not git-pull-on-host):** the remote
`/home/mba/docker/inspr-at/` is a flat directory, not a git checkout.
Making it a checkout adds a deploy-key materialization + a "what if
local and remote drift?" failure mode for negligible benefit — build
artifacts have to land there either way. Push-based rsync from one
machine keeps the deploy surface tiny. `inspr.nixos.pull-on-host`
(INSPR-176) is the right answer once the pattern shows up on a second
host; for inspr.at alone, a script is the right grain.

**Why a Unix-socket admin API:** the Caddyfile previously hardcoded
`admin off`, so any Caddyfile change required a container restart
(~1–2s downtime). `admin unix//config/caddy-admin.sock` keeps the API
off TCP (no external surface, no port published) while making `caddy
reload` work from inside the container — zero downtime for routine
config changes (new CSP hash, route tweak, header edit). The socket
lives in the `caddy_config` volume, which is never bind-mounted to the
host.
