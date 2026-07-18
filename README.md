# INSPR Sites

**One umbrella, three focused products, one coherent public surface.**

This repository powers the English-language INSPR site family:

- [www.inspr.at](https://www.inspr.at) - the INSPR idea and product map;
- [paimos.inspr.at](https://paimos.inspr.at) - shared project context for people and AI agents;
- [pharos.inspr.at](https://pharos.inspr.at) - clear fleet operations;
- [janus.inspr.at](https://janus.inspr.at) - policy-bound secret use;
- [v1.inspr.at](https://v1.inspr.at) - the frozen pre-relaunch archive.

The product sites are intentionally lightweight. They explain what the current
software does, where its boundaries are, how to inspect the source, and where
professional Augmentoring services fit without turning the open products into a
dark-pattern funnel.

[![License](https://img.shields.io/badge/license-AGPL--3.0--only-0b8178)](LICENSE)

## Repository map

```text
web/                  Astro source for all four current sites
site/                 frozen pre-relaunch archive served at v1.inspr.at
auth/                 small Go OIDC session and signup bridge
Caddyfile             host routing, cache policy and security headers
docker-compose.yml    Caddy, auth bridge, ZITADEL and Postgres
deploy.sh             immutable release upload, promotion, rollback and probes
```

One Astro build produces the umbrella page plus `/paimos`, `/pharos`, and
`/janus`. Caddy selects the right directory by hostname. Hashed Astro assets
live in an append-only shared pool so cached HTML remains valid across atomic
release switches.

## Local development

The frontend requires Node.js 22.12 or newer.

```bash
cd web
npm install
npm run dev -- --host 127.0.0.1 --port 4321
```

Open <http://127.0.0.1:4321>.

Product pages share one layout and typed content model. Most copy changes
belong in:

```text
web/src/content/paimos.ts
web/src/content/pharos.ts
web/src/content/janus.ts
```

The product-specific visual layer remains code-native: Lucide SVG symbols,
accessible workflow explorers, responsive Astro images and self-hosted fonts.
Generated editorial artwork supports a concrete claim; it never replaces
product UI or carries generated text. Paimos also includes a clearly labelled
screen from its synthetic visual-test fixture.

Shared URLs, including the professional-services destination, are centralized
in `web/src/content/urls.ts`. Set `PUBLIC_BUSINESS_URL` at build time when
the business hostname changes.

## Verification

Run the content contract and production build:

```bash
cd web
npm run test:content
npm run build
npm audit --audit-level=high
python3 scripts/verify-csp.py
```

The content tests protect:

- canonical product hosts;
- the shared `ProductPage` rendering path;
- the centralized business URL;
- the no-em-dash copy rule;
- exact `AGPL-3.0-only` product license claims; and
- per-host robots and sitemap output;
- workflow icons, evidence signals and source references;
- the four claim-supporting image assets; and
- the preserved INSPR product constellation.

`verify-csp.py` compares every inline script in the generated and archived
HTML against the hashes allowed by `Caddyfile`.

## Production model

Traefik terminates public TLS. A Caddy container serves:

- an immutable build selected by `releases/current`;
- append-only content-addressed assets in `releases/assets`; and
- the read-only archive in `site/`.

The deployment script:

1. builds and validates the static site;
2. uploads into an unreachable incoming directory;
3. verifies the remote content byte-for-byte;
4. seals the release under a unique build ID;
5. validates routing changes before promotion;
6. switches one symlink atomically;
7. verifies the result inside Caddy and through every public hostname; and
8. preserves the previous release for rollback.

Run production deployment from the repository root with the configured SSH
alias:

```bash
./deploy.sh
```

Deployment is intentionally user-driven. `deploy.sh` does not read or print
the production `.env`; runtime credentials stay out of this repository and
are managed on the host.

## Identity boundary

`auth/` is a small server-side OIDC bridge for `/login`, `/welcome`,
`/logout`, and the guarded signup entry path on the apex domain. ZITADEL is a
third-party identity service and remains operationally separate from the four
public product sites.

Never commit a populated `.env`, machine key, OIDC secret, cookie key, or
bootstrap token. The checked `.env.example` contains placeholders only.

## Product sources

- [Paimos](https://github.com/markus-barta/paimos)
- [Pharos](https://github.com/markus-barta/pharos)
- [Janus](https://github.com/markus-barta/janus)
- [INSPR operating modules](https://github.com/markus-barta/inspr-modules)

All three product repositories use `AGPL-3.0-only`. Each product page links
to its source, project license, official AGPL text, and professional services.

## License

The original work in this repository is licensed under
[`AGPL-3.0-only`](LICENSE). Third-party software, fonts, archived materials,
and dependencies retain their own licenses.
