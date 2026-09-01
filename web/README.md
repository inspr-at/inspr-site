# INSPR Astro frontend

This directory builds the current INSPR umbrella and product microsites from
one Astro application.

## Routes

| Route | Production host |
| --- | --- |
| `/` | `www.inspr.at` |
| external | `start.augmentoring.com` (Aithema preview) |
| `/paimos/` | `paimos.inspr.at` |
| `/pharos/` | `pharos.inspr.at` |
| `/janus/` | `janus.inspr.at` |

Caddy performs the host-to-directory mapping in production. The local Astro
server exposes the same pages by path.

## Commands

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4321
npm run test:content
npm run check
npm run build
npm audit --audit-level=high
```

`npm run check` runs `astro check` (TypeScript over `.astro` and `.ts`);
`npm run build` already includes `scripts/verify-csp.py`. The repository's
`ci` workflow runs the same gate on every pull request.

The build is static and writes to `dist/`.

`npm run build` also writes `dist/release.json` from the centralized release
metadata helper. Direct local builds render a truthful `local build` footer.
`deploy.sh` injects the non-secret `INSPR_GIT_SHA`, `INSPR_GIT_DIRTY`,
`INSPR_RELEASE_ID` and `INSPR_DEPLOYED_AT` values so all four production
footers and the manifest identify the exact immutable release transaction.

## Content model

`src/components/ProductPage.astro` renders all product pages from the typed
objects in `src/content/`. Keep product facts grounded in the corresponding
source repository and keep current limits visible.

Cross-site URLs live in `src/content/urls.ts`. The professional-services URL
is configurable through `PUBLIC_BUSINESS_URL`; do not hardcode its current
hostname in product content.

Artwork in `src/assets/products/` is part of the shared INSPR visual system.
Prefer optimized Astro image imports over public-directory copies.

The umbrella and products are authored by
[Markus Barta](https://github.com/markus-barta). Augmentoring is the
professional-services path that uses and supports them; it is not presented as
their owner. The canonical product sequence is **Aithema, Paimos, Pharos,
Janus**. Aithema currently links to its hosted preview at
`start.augmentoring.com`; its reusable template or module is planned for an
open-source release.

## License

The original INSPR site code and content are licensed under
`AGPL-3.0-only`; see the repository root `LICENSE`. Dependencies and bundled
third-party assets retain their own licenses.
