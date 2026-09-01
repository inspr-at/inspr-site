# INSPR Sites

**One idea, four products, one human-approved path.**

This repository powers the bilingual INSPR site family:

- [www.inspr.at](https://www.inspr.at) - the INSPR idea and product map;
- [aithema.inspr.at](https://aithema.inspr.at) - the Aithema requirements product page;
- [start.augmentoring.com](https://start.augmentoring.com) - the hosted Aithema requirements preview;
- [paimos.inspr.at](https://paimos.inspr.at) - shared project context for people and AI agents;
- [pharos.inspr.at](https://pharos.inspr.at) - clear fleet operations;
- [janus.inspr.at](https://janus.inspr.at) - policy-bound secret use;
- [v1.inspr.at](https://v1.inspr.at) - the frozen pre-relaunch archive.

Aithema (pronounced **AI-Thema**) is the first product in the family sequence
and owns requirements. Its product page is live at `aithema.inspr.at`. The
working public preview remains at
[start.augmentoring.com](https://start.augmentoring.com). A reusable open-source
Aithema template or module is planned; neither a product repository nor a
product license is claimed before that source exists.

The product sites are intentionally lightweight. INSPR and its products are
open work by [Markus Barta](https://github.com/markus-barta). The sites explain
what the current software does, where its boundaries are, how to inspect the
source, and where Augmentoring's professional services fit as a user of the
products rather than their owner.

[![License](https://img.shields.io/badge/license-AGPL--3.0--only-0b8178)](LICENSE)

## Repository map

```text
web/                  Astro source for the umbrella and four product sites
site/                 frozen pre-relaunch archive served at v1.inspr.at
auth/                 small Go OIDC session and signup bridge
Caddyfile             host routing, cache policy and security headers
docker-compose.yml    pre-adoption reference; the runtime is declared in nixcfg
deploy.sh             immutable release upload, promotion, rollback and probes
.github/workflows/    ci.yml: the pull-request gate (tests, type-check, build, audit)
```

One Astro build produces the bilingual umbrella, `/overview/` and
`/de/ueberblick/`, plus `/aithema`, `/paimos`, `/pharos`, and `/janus`.
`/eli10/` remains only as a redirect to the neutral Overview name. Caddy
selects the right directory by hostname. Hashed Astro assets
live in an append-only shared pool so cached HTML remains valid across atomic
release switches.

## Local development

The repository keeps the Higgsfield CLI isolated under
`tools/higgsfield-cli/` and pins it through npm. The devenv shell provisions
Node/npm, installs that lockfile with `npm clean-install` when required, and
adds the local CLI to `PATH` without a global npm install:

```bash
direnv allow
devenv shell -- higgsfield --version
```

Higgsfield's current generation API uses interactive OAuth. Authenticate once
from the prepared shell when needed:

```bash
higgsfield auth login
```

OAuth credentials remain in the user's local Higgsfield configuration and are
never sourced by this repository or committed. Devenv does not source an API
key or any other credential file.

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
web/src/content/aithema.ts
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
- the preserved INSPR product flow; and
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
definition and is not a runtime source. `deploy.sh` never reads, uploads or
applies that historical file; drift from any historical host copy is
irrelevant to a static release. Images, routing labels and volumes change only
in nixcfg; release content and the bind-mounted `Caddyfile` change here.

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

The bridge has no published host port and is reachable publicly only through
Traefik on `csb1_traefik`. That Docker bridge is shared with unrelated
containers, and the deployed cloudflarewarp v1.3.3 middleware incorrectly
trusts `172.16.0.0/12`, so neither a private source nor its rewritten headers
are identity evidence. The deployable edge contract filters the auth router to
Cloudflare's official source ranges before cloudflarewarp, overwrites a secret
attestation header after that check, and gives the same age-backed token to the
auth process. cloudflarewarp writes the visitor into `X-Real-IP` and
`X-Forwarded-For`; Traefik's service proxy then appends the immediate Cloudflare
edge to XFF. `/enter` accepts exactly that two-hop XFF shape when its first
value matches `X-Real-IP`, and only with the constant-time token, the plugin's
trusted marker, and an exact Docker-DNS-resolved Traefik peer. Any missing or
extra component falls back to the non-spoofable direct Traefik peer,
intentionally sharing one public bucket instead of trusting attacker-selected
identity.

The repository compose file is executable reference evidence, not the
authoritative csb1 configuration. **NIX-400 is a required rollout dependency**:
it owns the matching Cloudflare-first middleware and age-backed attestation in
nixcfg. No INSPR-310 image may be rolled out as fully functional before NIX-400
lands; without its token the application remains safe but uses the shared proxy
bucket. `auth/check-edge-contract.mjs` reproduces the sibling-through-Traefik
spoof, rejects it with the ordered reference gate, and CI compares the pinned
CIDRs with Cloudflare's official IPv4/IPv6 endpoints so range drift fails
visibly. The gate also pins cloudflarewarp's built-in range source, proves
`disableDefault: false` trusts every official IPv6 range, and verifies that the
plugin overwrites its trusted marker on both trusted and untrusted branches.
It also pins the observed Traefik v3.7.12 proxy sources that preserve
`X-Real-IP` and append the edge peer to `X-Forwarded-For`.

Signup uses the User API v2beta contract shipped by the deployed ZITADEL
v2.54.8 image: creation emits an unverified email-code notification, the link
returns to `/enter/verify`, and only a successful ownership check can request a
passwordless-registration mail. That exact management endpoint requires
`user.write`, which is present in the scoped `ORG_USER_MANAGER` role; the v2
returned-code endpoint requires the broader `user.passkey.write` permission and
is deliberately not used. Before creating, signup uses ZITADEL's
organization/permission-filtered exact-email search, so a lost response,
provider-generated historical ID, or local `COOKIE_KEY` rotation still reaches
the provider-held account rather than importing again. New and recovery paths
both make two provider calls and return the same public status/body. A verified
credentialless account receives a throttled passwordless recovery mail;
concurrent ownership-link followers wait for the shared provider result, and a
successful replay remains idempotent until link expiry. IP and hashed-email
rate keys have separate bounded namespaces; live IP keys use LRU admission,
while live email keys fail closed so capacity pressure cannot reset a mail
limit or deny already-known email keys. The pinned
endpoint, event, and role evidence is recorded in
[`auth/ZITADEL-CONTRACT.md`](auth/ZITADEL-CONTRACT.md).

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

- **Aithema** - product page: [aithema.inspr.at](https://aithema.inspr.at);
  reusable open-source template or module planned; public preview at
  [start.augmentoring.com](https://start.augmentoring.com)
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
