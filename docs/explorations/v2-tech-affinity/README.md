# v2 — tech-affinity exploration

**Status:** exploration. **Not shipped.** v1 is what's live at inspr.at.

## What this was

A second-direction iteration explored on 2026-05-03 in response to the
question of whether v1's "stylized print catalogue" tone could be made
more *engineering-document* without losing the editorial backbone.

Direction shift:

- **Materials:** from handmade washi paper + sumi ink (artisanal print)
  to precision-machined laminates, calibrated rule-marks, photometric
  gradients (precision engineering).
- **Compositions:** from full-width banner plates between content blocks
  to integrated companion strips — vertical gutter on Mission, image-as-
  diagram on Pluralism, per-card image insets on Artifacts, gradient
  backdrop on Audience.
- **Design language:** § N section ornaments (engineering-document
  convention) instead of asterisms; persistent vertical column-rule grid;
  tighter Fraunces axis presets (less SOFT, more rational defaults).

## Why it stayed an exploration

The operator decided v1's editorial language was the right launch tone
for the substrate-pluralist mission. v2 is preserved here as a future
option — a different aesthetic register the same content could speak in
when there's reason to revisit the visual language (e.g., a future
`/architecture` reading edition aimed at a more engineering-coded
audience could lean on this material).

## Contents

```
prompts/                 — Nano Banana Pro prompts for all 7 v2 images
                           (cream/ink palette, but precision-engineered
                           materials instead of artisanal ones)
../../web/src/assets/v2/ — the 7 generated source images
                           (hero, mission, pluralism, contract,
                            artifacts, audience, footer)
```

Generation cost: ~$1.10 across 7 images via
`google/gemini-3-pro-image-preview` (Nano Banana Pro). Total dev time:
~30 minutes. Rough notes captured in this directory; the design-system
changes that would have accompanied this direction (§ N ornaments,
column-rule grid, tighter axes) are *not* committed — they were reverted
at decision time. To reconstruct them, see commit history around the
range `a70ec02..HEAD` of 2026-05-03 evening.

## Reactivating v2 later

If we revisit:

1. Re-apply the CSS direction (§ N ornaments + vertical grid + tighter
   axes) — the diff is small and recoverable from the reflog.
2. Wire the v2 images into the section components per the integrated-
   composition plan in this README's "compositions" section.
3. The prompts in `prompts/` are reusable as-is — re-run via
   `web/scripts/gen-image.py` if a refresh is needed.
