# INSPR Sites

**One umbrella, four focused products, one coherent public surface.**

This repository powers the English-language INSPR site family:

- [www.inspr.at](https://www.inspr.at) - the INSPR idea and product map;
- [paimos.inspr.at](https://paimos.inspr.at) - shared project context for people and AI agents;
- [pharos.inspr.at](https://pharos.inspr.at) - clear fleet operations;
- [janus.inspr.at](https://janus.inspr.at) - policy-bound secret use;
- [v1.inspr.at](https://v1.inspr.at) - the frozen pre-relaunch archive.

The fourth product is **Aithema** (pronounced **AI-Thema**), the requirements
product at [start.augmentoring.com](https://start.augmentoring.com). This
repository links to that visitor experience from the shared product navigation;
it does not build or host it.

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
docker-compose.yml    pre-adoption reference; the runtime is declared in nixcfg
deploy.sh             immutable release upload, promotion, rollback and probes
.github/workflows/    ci.yml: the pull-request gate (tests, type-check, build, audit)
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
npm run check
npm run build
npm audit --audit-level=high
```

`npm run check` is `astro check`, the TypeScript pass over every `.astro` and
`.ts` file; `npm run build` chains the capture check, the release manifest,
the hero-loop audit, `scripts/verify-csp.py` and the section-pattern audit.
The same four commands run in GitHub Actions (`.github/workflows/ci.yml`) on
every pull request and on `main`; a red `ci` check means the change is not
deployable.

The content tests protect:

- canonical product hosts;
- the shared `ProductPage` rendering path;
- the centralized business URL;
- the no-em-dash copy rule;
- exact `AGPL-3.0-only` product license claims; and
- per-host robots and sitemap output;
- workflow icons, evidence signals and source references;
- the four claim-supporting image assets;
- the preserved INSPR product constellation; and
- every `icon` and `group` in `src/content/*.ts` resolving in `ContextIcon`
  and the tile type, so an unknown name fails the suite instead of degrading
  silently in the rendered page.

`verify-csp.py` compares every inline script in the generated and archived
HTML against the hashes allowed by `Caddyfile`.

## Production model

Traefik terminates public TLS. A Caddy container serves:

- an immutable build selected by `releases/current`;
- append-only content-addressed assets in `releases/assets`; and
- the read-only archive in `site/`.

The containers themselves (`inspr-www`, `inspr-auth`, `zitadel`,
`zitadel-postgres`) have been declared in nixcfg
(`hosts/csb1/docker/compose-spec.nix`, compose project `csb1`) since OPS-136
on 2026-08-04. `docker-compose.yml` in this repository is the pre-adoption
definition, kept byte-identical to the host's reference copy: `deploy.sh`
never applies it and refuses to run when the two drift. Images, routing
labels and volumes change in nixcfg; release content and the bind-mounted
`Caddyfile` change here.

The deployment script:

1. assigns one UTC deployment timestamp, Git revision and immutable release ID;
2. builds and validates the static site with that release identity;
3. uploads into an unreachable incoming directory;
4. verifies the remote content byte-for-byte;
5. seals the release under its unique build ID;
6. validates a changed `Caddyfile` before promotion and restarts `inspr-www` to pick it up;
7. switches one symlink atomically;
8. verifies the release stamp and result through every public hostname; and
9. preserves the previous release for rollback.

Every current site displays the shared site-package version, short Git
revision, immutable release ID and UTC deployment time in its footer. The
deployment transaction supplies `INSPR_GIT_SHA`, `INSPR_GIT_DIRTY`,
`INSPR_RELEASE_ID` and `INSPR_DEPLOYED_AT` only to the build process, which
also records the allowlisted values in `web/dist/release.json`. A direct local
build is labelled `local build` and never invents a deployment timestamp.
`SKIP_BUILD=1` accepts only a previously prepared deploy build with a valid
release manifest. Production deployment also requires a clean working tree
and re-checks the source revision after the build before any remote write.

Run production deployment from the repository root with the configured SSH
alias:

```bash
./deploy.sh
```

If the configured hostname cannot be resolved but its route is otherwise
available, deployment can use a direct DNS name or IPv4 address without
weakening host-key verification. Set `INSPR_AT_SSH_HOSTNAME` together with
`INSPR_AT_SSH_HOST_KEY_ALIAS`; the latter must name an already trusted
`known_hosts` identity. Both a plain alias and OpenSSH's `[host]:port` identity
form are accepted. The bracketed form requires an explicit, matching
`INSPR_AT_SSH_PORT`; the port remains optional with a plain alias. The direct
path enforces `StrictHostKeyChecking=yes` for SSH, SCP and rsync and fails closed
when either identity setting is missing, mismatched or unsafe.

Deployment is intentionally user-driven. `deploy.sh` does not read or print
the production `.env`; runtime credentials stay out of this repository and
are managed on the host.

## Identity boundary

`auth/` is a small server-side OIDC bridge for `/login`, `/welcome`,
`/logout`, and the guarded signup entry path on the apex domain. ZITADEL is a
third-party identity service and remains operationally separate from the four
public product sites.

The image running on csb1 (`ghcr.io/inspr-at/inspr-auth:legacy-20260511`) was
built from this `auth/` source; the host's working copy differs only by the
later AGPL image label and the module path from the organisation move.

`.github/workflows/auth-image.yml` (INSPR-253) builds and publishes the bridge
to `ghcr.io/inspr-at/inspr-site/inspr-auth`: pull requests that touch `auth/`
build without pushing; pushes to `main` publish `:main` and `:sha-<commit>`;
an annotated `auth-vX.Y.Z` tag publishes the immutable `:X.Y.Z` (plus
`:latest`). Every published image carries BuildKit SLSA provenance and an
SPDX SBOM and is signed keyless with cosign through the workflow identity:

The workflow loads and scans the image locally before any registry write. On a
publishing event it then exports the verified image by digest, checks that the
pushed config is exactly the config Trivy scanned, verifies its attestations,
signs and verifies that digest, and only then creates the release tags.

```bash
cosign verify ghcr.io/inspr-at/inspr-site/inspr-auth@<digest> \
  --certificate-identity-regexp 'https://github.com/inspr-at/inspr-site/.github/workflows/auth-image.yml@refs/tags/auth-v.*' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

Since 0.2.0 (INSPR-307) the bridge builds on the current Go release line
(`golang:1.26-alpine`) with current modules, and the Trivy scan in the same
workflow is a gate: any fixable CRITICAL or HIGH finding in the OS layer or
the Go binary fails pull requests and publishes alike. Keep `go.mod` and the
base image moving; do not silence the scan.

Cut a release with `git tag -a auth-vX.Y.Z -m "..." && git push origin
auth-vX.Y.Z`. The package is private by decision; csb1's compose units
authenticate with a scoped read token (nixcfg NIX-384). Moving the csb1
digest pin to a published version is a reviewed nixcfg change (INSPR-253,
step 3). `auth-legacy-rehome.yml` (dispatch only) copies the hand-built
2026-05-11 rescue manifest into this package as `legacy-20260511`, digest
preserved and cosign-signed as chain of custody; it is the rollback target
for the pin swap, after which the old public `ghcr.io/inspr-at/inspr-auth`
package is deleted.

Never commit a populated `.env`, machine key, OIDC secret, cookie key, or
bootstrap token. The checked `.env.example` contains placeholders only.

## Product sources

- [Paimos](https://github.com/inspr-at/paimos)
- [Pharos](https://github.com/inspr-at/pharos)
- [Janus](https://github.com/inspr-at/janus)
- [INSPR operating modules](https://github.com/inspr-at/inspr-modules)

The three open-source product repositories use `AGPL-3.0-only`. Each hosted
product page links to its source, project license, official AGPL text, and
professional services.

## License

The original work in this repository is licensed under
[`AGPL-3.0-only`](LICENSE). Third-party software, fonts, archived materials,
and dependencies retain their own licenses.
