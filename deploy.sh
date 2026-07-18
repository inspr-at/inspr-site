#!/usr/bin/env bash
# shellcheck disable=SC2029 # Deployment paths intentionally expand client-side.
# deploy.sh - deploy the INSPR microsite family to csb1.
#
# Current build and archive are intentionally separate:
#   web/dist/ -> releases/builds/<id>/   (immutable, checksum-verified)
#   web/dist/_astro/ -> releases/assets/  (append-only hashed asset pool)
#   releases/current -> builds/<id>       (atomic promotion and rollback)
#   site/                                 (v1 archive, never written)
#
# The current Astro build contains the umbrella page plus /paimos, /pharos
# and /janus. Caddy maps each product hostname to its folder and serves
# content-addressed /_astro files from the append-only shared asset pool.
#
# Env vars:
#   INSPR_AT_HOST       SSH alias or host (default: csb1)
#   INSPR_AT_SSH_PORT   optional SSH port (SSH config applies when unset)
#   INSPR_AT_DIR        remote dir (default: /home/mba/docker/inspr-at)
#   SKIP_BUILD=1        reuse existing web/dist/
#   SKIP_PROBE=1        skip read-only post-deploy HTTPS probes
#   PROBE_TIMEOUT       maximum seconds per probe (default: 20)
#   PROBE_ATTEMPTS      attempts while routing converges (default: 20)
#   PROBE_RESOLVE_IP    optional IPv4 override for fresh-DNS cutover probes
#
# deploy.sh supplies INSPR_GIT_SHA, INSPR_GIT_DIRTY, INSPR_RELEASE_ID and
# INSPR_DEPLOYED_AT only to the Astro build process. They are non-secret,
# allowlisted release evidence and are written into web/dist/release.json.
#
# Releases are retained on the server. `previous` points at the prior healthy
# release; older immutable builds remain available for an operator-selected
# rollback. Production execution remains user-driven.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST="${INSPR_AT_HOST:-csb1}"
SSH_PORT="${INSPR_AT_SSH_PORT:-}"
REMOTE_DIR="${INSPR_AT_DIR:-/home/mba/docker/inspr-at}"
PROBE_TIMEOUT="${PROBE_TIMEOUT:-20}"
PROBE_ATTEMPTS="${PROBE_ATTEMPTS:-20}"
PROBE_RESOLVE_IP="${PROBE_RESOLVE_IP:-}"
REMOTE_RELEASE_ROOT="$REMOTE_DIR/releases"

PROMOTION_STARTED=0
SYMLINK_SWITCHED=0
CONFIG_PROMOTION_ATTEMPTED=0
CURRENT_RELEASE=""
RELEASE_ID=""
ROLLBACK_DIR=""

say() { printf '\033[1;36m->\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32mOK\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR\033[0m %s\n' "$*" >&2; exit 1; }

SSH_ARGS=(-o BatchMode=yes -o ConnectTimeout=10)
SCP_ARGS=(-o BatchMode=yes -o ConnectTimeout=10)
RSYNC_SSH="ssh -o BatchMode=yes -o ConnectTimeout=10"

if [ -n "$SSH_PORT" ]; then
  [[ "$SSH_PORT" =~ ^[0-9]+$ ]] || die "INSPR_AT_SSH_PORT must be numeric"
  [ "$SSH_PORT" -ge 1 ] && [ "$SSH_PORT" -le 65535 ] || \
    die "INSPR_AT_SSH_PORT must be between 1 and 65535"
  SSH_ARGS+=(-p "$SSH_PORT")
  SCP_ARGS+=(-P "$SSH_PORT")
  RSYNC_SSH+=" -p $SSH_PORT"
fi

remote_ssh() {
  [ "$#" -eq 1 ] || die "remote_ssh expects exactly one command string"
  printf '%s\n' "$1" | ssh "${SSH_ARGS[@]}" "$HOST" bash -se
}

remote_scp() {
  scp "${SCP_ARGS[@]}" "$@"
}

remote_hash() {
  local relative_path="$1"
  remote_ssh "sha256sum '$REMOTE_DIR/$relative_path' 2>/dev/null | awk '{print \$1}'" || true
}

read_release_manifest() {
  local manifest_path="$1"

  node - "$manifest_path" <<'NODE'
const { readFileSync } = require("node:fs");

const manifestPath = process.argv[2];
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const releaseId = manifest?.deployment?.releaseId;
const deployedAt = manifest?.deployment?.deployedAt;
const gitRevision = manifest?.source?.git;
const gitDirty = manifest?.source?.dirty;
const version = manifest?.package?.version;

if (manifest?.schemaVersion !== 1) throw new Error("unsupported release manifest schema");
if (!/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(releaseId) || releaseId === "local") {
  throw new Error("release manifest has no deployable release id");
}
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(deployedAt)) {
  throw new Error("release manifest has no UTC deployment timestamp");
}
if (!/^[0-9a-f]{7,64}$/i.test(gitRevision)) {
  throw new Error("release manifest has no valid Git revision");
}
if (typeof gitDirty !== "boolean") throw new Error("release manifest has no Git state");
if (typeof version !== "string" || !version.trim()) {
  throw new Error("release manifest has no package version");
}

process.stdout.write([
  releaseId,
  deployedAt,
  gitRevision.toLowerCase(),
  gitDirty ? "1" : "0",
  version,
].join("\t"));
NODE
}

atomic_release_link() {
  local target="$1"
  local link_name="$2"
  local nonce="$3"

  remote_ssh "set -eu
    cd '$REMOTE_RELEASE_ROOT'
    test -d '$target'
    test ! -e '.$link_name-$nonce'
    ln -s '$target' '.$link_name-$nonce'
    mv -Tf '.$link_name-$nonce' '$link_name'"
}

rollback_deployment() {
  set +e
  printf '\033[1;33mROLLBACK\033[0m restoring the last known deployment\n' >&2

  if [ "$SYMLINK_SWITCHED" = "1" ]; then
    if [ -n "$CURRENT_RELEASE" ]; then
      atomic_release_link "$CURRENT_RELEASE" "current" "${RELEASE_ID}-rollback"
    else
      # There was no release link before the initial cutover. Keep the failed
      # release recoverable, but restore the exact absence of `current`.
      remote_ssh "set -eu
        cd '$REMOTE_RELEASE_ROOT'
        if [ -L current ]; then
          mv -Tf current 'failed-current-$RELEASE_ID'
        fi"
    fi
  fi

  if [ "$CONFIG_PROMOTION_ATTEMPTED" = "1" ] && [ -n "$ROLLBACK_DIR" ]; then
    remote_ssh "set -eu
      cp -p '$ROLLBACK_DIR/Caddyfile' '$REMOTE_DIR/Caddyfile.rollback-$RELEASE_ID'
      cp -p '$ROLLBACK_DIR/docker-compose.yml' '$REMOTE_DIR/docker-compose.yml.rollback-$RELEASE_ID'
      mv -Tf '$REMOTE_DIR/Caddyfile.rollback-$RELEASE_ID' '$REMOTE_DIR/Caddyfile'
      mv -Tf '$REMOTE_DIR/docker-compose.yml.rollback-$RELEASE_ID' '$REMOTE_DIR/docker-compose.yml'
      cd '$REMOTE_DIR'
      docker compose up -d --no-deps --force-recreate inspr-www" || \
      printf '\033[1;31mERROR\033[0m automatic config rollback needs operator attention\n' >&2
  fi

  printf '\033[1;33mROLLBACK\033[0m failed release retained as builds/%s\n' "$RELEASE_ID" >&2
}

on_exit() {
  local status=$?
  trap - EXIT INT TERM

  if [ "$status" -ne 0 ] && [ "$PROMOTION_STARTED" = "1" ]; then
    rollback_deployment
  fi

  exit "$status"
}

trap on_exit EXIT
trap 'exit 130' INT TERM

[[ "$HOST" =~ ^[[:alnum:]][[:alnum:].@:_-]*$ ]] || die "unsafe INSPR_AT_HOST value"
[[ "$REMOTE_DIR" =~ ^/[[:alnum:]_.@/-]+$ ]] || die "unsafe INSPR_AT_DIR value"
[[ "$REMOTE_DIR" != *"/../"* && "$REMOTE_DIR" != */.. ]] || die "INSPR_AT_DIR must not contain .."
[[ "$REMOTE_DIR" == */inspr-at ]] || die "INSPR_AT_DIR must end in /inspr-at"
[[ "$PROBE_TIMEOUT" =~ ^[0-9]+$ ]] && [ "$PROBE_TIMEOUT" -ge 1 ] && [ "$PROBE_TIMEOUT" -le 300 ] || \
  die "PROBE_TIMEOUT must be between 1 and 300 seconds"
[[ "$PROBE_ATTEMPTS" =~ ^[0-9]+$ ]] && [ "$PROBE_ATTEMPTS" -ge 1 ] && [ "$PROBE_ATTEMPTS" -le 60 ] || \
  die "PROBE_ATTEMPTS must be between 1 and 60"

if [ -n "$PROBE_RESOLVE_IP" ]; then
  [[ "$PROBE_RESOLVE_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || \
    die "PROBE_RESOLVE_IP must be an IPv4 address"
  IFS=. read -r probe_octet_1 probe_octet_2 probe_octet_3 probe_octet_4 <<<"$PROBE_RESOLVE_IP"
  for probe_octet in "$probe_octet_1" "$probe_octet_2" "$probe_octet_3" "$probe_octet_4"; do
    [ "$probe_octet" -le 255 ] || die "PROBE_RESOLVE_IP contains an invalid octet"
  done
fi

probe_headers() {
  local url="$1"
  local separator="?"
  local probe_host
  local probe_port
  local probe_scheme
  local curl_args=(
    --silent
    --show-error
    --dump-header -
    --output /dev/null
    --connect-timeout 10
    --max-time "$PROBE_TIMEOUT"
    --header 'Cache-Control: no-cache'
  )

  if [[ "$url" == *\?* ]]; then
    separator="&"
  fi

  if [ -n "$PROBE_RESOLVE_IP" ]; then
    probe_scheme="${url%%://*}"
    probe_host="${url#*://}"
    probe_host="${probe_host%%/*}"
    case "$probe_scheme" in
      https) probe_port=443 ;;
      http) probe_port=80 ;;
      *) die "probe URL must use http or https" ;;
    esac
    curl_args+=(--resolve "$probe_host:$probe_port:$PROBE_RESOLVE_IP")
  fi

  curl "${curl_args[@]}" "${url}${separator}probe=$(date +%s)"
}

probe_page() {
  local label="$1"
  local url="$2"
  local body_token="$3"
  local expected_content_type="$4"
  local expected_release_id="${5:-}"
  local headers
  local code
  local content_type
  local body
  local probe_host
  local attempt=1
  local matched=0

  while [ "$attempt" -le "$PROBE_ATTEMPTS" ]; do
    if headers=$(probe_headers "$url"); then
      code=$(printf '%s\n' "$headers" | tr -d '\r' | awk '/^HTTP\// { value=$2 } END { print value }')
      if [ "$code" = "200" ]; then
        matched=1
        break
      fi
    else
      code="request failed"
    fi
    [ "$attempt" -lt "$PROBE_ATTEMPTS" ] || break
    sleep 1
    attempt=$((attempt + 1))
  done
  [ "$matched" = "1" ] || die "$label -> ${code:-unknown} (expected 200 after $PROBE_ATTEMPTS attempts)"

  content_type=$(printf '%s\n' "$headers" | tr -d '\r' | awk '
    tolower($1) == "content-type:" { value=$2 }
    END { print value }
  ')
  [[ "$content_type" == "$expected_content_type"* ]] || \
    die "$label -> unexpected Content-Type: ${content_type:-missing}"

  printf '%s\n' "$headers" | tr -d '\r' | grep -qi '^content-security-policy:' || \
    die "$label -> Content-Security-Policy missing"
  printf '%s\n' "$headers" | tr -d '\r' | grep -qi '^x-content-type-options:[[:space:]]*nosniff' || \
    die "$label -> X-Content-Type-Options missing"

  if [ -n "$body_token" ] || [ -n "$expected_release_id" ]; then
    local body_curl_args=(
      --silent
      --show-error
      --fail
      --connect-timeout 10
      --max-time "$PROBE_TIMEOUT"
      --header 'Cache-Control: no-cache'
    )
    if [ -n "$PROBE_RESOLVE_IP" ]; then
      probe_host="${url#https://}"
      probe_host="${probe_host%%/*}"
      body_curl_args+=(--resolve "$probe_host:443:$PROBE_RESOLVE_IP")
    fi
    if ! body=$(curl "${body_curl_args[@]}" "$url"); then
      die "$label -> body request failed"
    fi
    if [ -n "$body_token" ]; then
      [[ "$body" == *"$body_token"* ]] || die "$label -> expected content missing"
    fi
    if [ -n "$expected_release_id" ]; then
      [[ "$body" == *"data-release-id=\"$expected_release_id\""* ]] || \
        die "$label -> expected release metadata missing"
    fi
  fi

  ok "$label -> 200, content and security headers verified"
}

probe_redirect() {
  local label="$1"
  local url="$2"
  local expected_codes="$3"
  local expected_location_prefix="$4"
  local headers
  local code
  local location
  local attempt=1
  local matched=0

  while [ "$attempt" -le "$PROBE_ATTEMPTS" ]; do
    if headers=$(probe_headers "$url"); then
      code=$(printf '%s\n' "$headers" | tr -d '\r' | awk '/^HTTP\// { value=$2 } END { print value }')
      case ",$expected_codes," in
        *",$code,"*) matched=1; break ;;
      esac
    else
      code="request failed"
    fi
    [ "$attempt" -lt "$PROBE_ATTEMPTS" ] || break
    sleep 1
    attempt=$((attempt + 1))
  done
  [ "$matched" = "1" ] || \
    die "$label -> ${code:-unknown} (expected $expected_codes after $PROBE_ATTEMPTS attempts)"

  location=$(printf '%s\n' "$headers" | tr -d '\r' | awk '
    tolower($1) == "location:" { value=$2 }
    END { print value }
  ')
  [[ "$location" == "$expected_location_prefix"* ]] || \
    die "$label -> unexpected redirect target"

  ok "$label -> $code, target verified"
}

# 1. Build the single static application with one truthful release identity.
if [ "${SKIP_BUILD:-}" = "1" ]; then
  say "build skipped (SKIP_BUILD=1); reusing web/dist/"
else
  DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  GIT_SHA="$(git -C "$ROOT" rev-parse --verify HEAD)"
  [[ "$GIT_SHA" =~ ^[0-9a-fA-F]{40,64}$ ]] || die "unable to resolve the source Git revision"
  GIT_SHORT="${GIT_SHA:0:12}"
  GIT_DIRTY=0
  if [ -n "$(git -C "$ROOT" status --porcelain --untracked-files=normal)" ]; then
    GIT_DIRTY=1
  fi
  [ "$GIT_DIRTY" = "0" ] || die "refusing to deploy a dirty working tree; commit the release first"
  RELEASE_TIMESTAMP="${DEPLOYED_AT//[-:]/}"
  RELEASE_ID="$RELEASE_TIMESTAMP-$GIT_SHORT"

  say "building Astro microsites"
  (
    cd "$ROOT/web"
    INSPR_GIT_SHA="$GIT_SHA" \
      INSPR_GIT_DIRTY="$GIT_DIRTY" \
      INSPR_RELEASE_ID="$RELEASE_ID" \
      INSPR_DEPLOYED_AT="$DEPLOYED_AT" \
      npm run build
  )
fi

# 2. Reject unpinned inline scripts before any remote write.
say "verifying CSP hashes"
python3 "$ROOT/web/scripts/verify-csp.py"

# 3. Confirm the one-build/four-site output contract.
required_documents=(
  "index.html"
  "paimos/index.html"
  "pharos/index.html"
  "janus/index.html"
  "release.json"
)
for document in "${required_documents[@]}"; do
  [ -f "$ROOT/web/dist/$document" ] || die "missing build output: web/dist/$document"
done

shared_asset=$(find "$ROOT/web/dist/_astro" -maxdepth 1 -type f -name '*.css' -print -quit 2>/dev/null || true)
[ -n "$shared_asset" ] || die "missing shared Astro assets in web/dist/_astro/"
shared_asset_path="/_astro/${shared_asset##*/}"
[ -f "$ROOT/site/index.html" ] || die "local v1 archive is missing: site/index.html"

MANIFEST_FIELDS=$(read_release_manifest "$ROOT/web/dist/release.json") || \
  die "release manifest validation failed"
IFS=$'\t' read -r MANIFEST_RELEASE_ID MANIFEST_DEPLOYED_AT MANIFEST_GIT_SHA \
  MANIFEST_GIT_DIRTY MANIFEST_VERSION <<<"$MANIFEST_FIELDS"

if [ "${SKIP_BUILD:-}" != "1" ]; then
  [ "$MANIFEST_RELEASE_ID" = "$RELEASE_ID" ] || die "release id changed during the build"
  [ "$MANIFEST_DEPLOYED_AT" = "$DEPLOYED_AT" ] || die "deployment timestamp changed during the build"
  [ "$MANIFEST_GIT_SHA" = "${GIT_SHA:0:12}" ] || die "Git revision changed during the build"
  [ "$MANIFEST_GIT_DIRTY" = "$GIT_DIRTY" ] || die "Git state changed during the build"
fi

CURRENT_GIT_SHA="$(git -C "$ROOT" rev-parse --verify HEAD)"
CURRENT_GIT_DIRTY=0
if [ -n "$(git -C "$ROOT" status --porcelain --untracked-files=normal)" ]; then
  CURRENT_GIT_DIRTY=1
fi
[ "$CURRENT_GIT_DIRTY" = "0" ] || die "source changed during the build; refusing remote writes"
[ "$MANIFEST_GIT_DIRTY" = "0" ] || die "release manifest describes a dirty source tree"
[ "$MANIFEST_GIT_SHA" = "${CURRENT_GIT_SHA:0:12}" ] || \
  die "release manifest does not match the current Git revision"

RELEASE_ID="$MANIFEST_RELEASE_ID"
DEPLOYED_AT="$MANIFEST_DEPLOYED_AT"
ok "build contract verified for site v$MANIFEST_VERSION, release $RELEASE_ID"

# 4. Fingerprint the rendered content. The release id already embedded in the
# build combines its deployment transaction timestamp and source revision;
# the full content hash remains the byte-level verification identity.
BUILD_HASH=$(
  cd "$ROOT/web/dist"
  find . -type f -print | LC_ALL=C sort | while IFS= read -r file; do
    shasum -a 256 "$file"
  done | shasum -a 256 | awk '{print $1}'
)
ok "rendered content fingerprint ${BUILD_HASH:0:12}"
RELEASE_TARGET="builds/$RELEASE_ID"
REMOTE_INCOMING="$REMOTE_RELEASE_ROOT/.incoming-$RELEASE_ID"
REMOTE_RELEASE="$REMOTE_RELEASE_ROOT/$RELEASE_TARGET"
ROLLBACK_DIR="$REMOTE_RELEASE_ROOT/rollbacks/$RELEASE_ID"

# 5. Confirm the archive and deployment paths before writing anything. The
# tracked site/ archive is never an rsync or promotion target.
if ! remote_ssh "test -f '$REMOTE_DIR/site/index.html'"; then
  die "remote v1 archive is missing; refusing to create an empty archive mount"
fi
ok "remote v1 archive present"

# A non-symlink `current` is an unknown layout and must never be overwritten.
remote_ssh "set -eu
  mkdir -p '$REMOTE_RELEASE_ROOT/builds' '$REMOTE_RELEASE_ROOT/assets/_astro' '$REMOTE_RELEASE_ROOT/rollbacks'
  if [ -e '$REMOTE_RELEASE_ROOT/current' ] && [ ! -L '$REMOTE_RELEASE_ROOT/current' ]; then
    exit 41
  fi
  test ! -e '$REMOTE_INCOMING'
  test ! -e '$REMOTE_RELEASE'
  mkdir '$REMOTE_INCOMING'" || die "remote release layout is unsafe or release id already exists"

# Upload into a path Caddy cannot reach. The second checksum-mode rsync must
# report no change before the directory is renamed into immutable builds/.
say "uploading immutable release $RELEASE_ID"
rsync -az --delay-updates -e "$RSYNC_SSH" \
  "$ROOT/web/dist/" "$HOST:$REMOTE_INCOMING/"

RSYNC_DELTA=$(rsync -aznc --delete --itemize-changes -e "$RSYNC_SSH" \
  "$ROOT/web/dist/" "$HOST:$REMOTE_INCOMING/")
[ -z "$RSYNC_DELTA" ] || die "remote release checksum verification failed"

# Publish content-addressed assets before any HTML switch. Existing hashes are
# never overwritten; checksum mode detects the practically-impossible case of
# one name referring to different bytes. Old hashes stay valid for cached HTML.
rsync -az --delay-updates --ignore-existing -e "$RSYNC_SSH" \
  "$ROOT/web/dist/_astro/" "$HOST:$REMOTE_RELEASE_ROOT/assets/_astro/"
# Compare names and bytes only. Repeated Astro builds can give identical
# content-addressed files fresh mtimes; metadata drift must not invalidate an
# otherwise byte-identical append-only asset.
ASSET_DELTA=$(rsync -rzcn --itemize-changes -e "$RSYNC_SSH" \
  "$ROOT/web/dist/_astro/" "$HOST:$REMOTE_RELEASE_ROOT/assets/_astro/")
[ -z "$ASSET_DELTA" ] || die "shared asset checksum verification failed"

remote_ssh "set -eu
  test -f '$REMOTE_INCOMING/index.html'
  test -f '$REMOTE_INCOMING/paimos/index.html'
  test -f '$REMOTE_INCOMING/pharos/index.html'
  test -f '$REMOTE_INCOMING/janus/index.html'
  test -n \"\$(find '$REMOTE_INCOMING/_astro' -maxdepth 1 -type f -name '*.css' -print -quit)\"
  mv '$REMOTE_INCOMING' '$REMOTE_RELEASE'"
ok "release uploaded, checksum-verified and sealed"

# 6. Stage and validate routing configuration before promotion.
LOCAL_CADDY_HASH=$(shasum -a 256 "$ROOT/Caddyfile" | awk '{print $1}')
REMOTE_CADDY_HASH=$(remote_hash "Caddyfile")
LOCAL_COMPOSE_HASH=$(shasum -a 256 "$ROOT/docker-compose.yml" | awk '{print $1}')
REMOTE_COMPOSE_HASH=$(remote_hash "docker-compose.yml")

CADDY_CHANGED=0
COMPOSE_CHANGED=0

if [ "$LOCAL_CADDY_HASH" != "$REMOTE_CADDY_HASH" ]; then
  CADDY_CHANGED=1
  say "staging and validating Caddyfile"
  remote_scp -q "$ROOT/Caddyfile" "$HOST:$REMOTE_DIR/Caddyfile.next-$RELEASE_ID"
  remote_ssh \
    "docker run --rm --network none -v '$REMOTE_DIR/Caddyfile.next-$RELEASE_ID:/etc/caddy/Caddyfile:ro' caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null"
fi

if [ "$LOCAL_COMPOSE_HASH" != "$REMOTE_COMPOSE_HASH" ]; then
  COMPOSE_CHANGED=1
  say "staging and validating docker-compose.yml"
  remote_scp -q "$ROOT/docker-compose.yml" "$HOST:$REMOTE_DIR/docker-compose.yml.next-$RELEASE_ID"
  remote_ssh "cd '$REMOTE_DIR' && docker compose -f 'docker-compose.yml.next-$RELEASE_ID' config --quiet"
fi

# Record the currently healthy release. It remains live during repeat-deploy
# config changes and becomes the rollback target after the atomic switch.
CURRENT_RELEASE=$(remote_ssh "set -eu
  if [ -L '$REMOTE_RELEASE_ROOT/current' ]; then
    readlink '$REMOTE_RELEASE_ROOT/current'
  fi")

if [ -n "$CURRENT_RELEASE" ] && [[ ! "$CURRENT_RELEASE" =~ ^builds/[[:alnum:]_.-]+$ ]]; then
  die "remote current link has an unexpected target"
fi

# Preserve both live config files before either is promoted. A single-file
# bind mount follows its inode, so Caddy changes deliberately recreate the
# stateless site container instead of relying on a reload after atomic rename.
if [ "$CADDY_CHANGED" = "1" ] || [ "$COMPOSE_CHANGED" = "1" ]; then
  remote_ssh "set -eu
    mkdir -p '$ROLLBACK_DIR'
    cp -p '$REMOTE_DIR/Caddyfile' '$ROLLBACK_DIR/Caddyfile'
    cp -p '$REMOTE_DIR/docker-compose.yml' '$ROLLBACK_DIR/docker-compose.yml'"
fi

# On the first cutover the old container still serves site/. Seed `current`
# before its compose file changes. On repeat deploys the old release stays live
# through any container recreation and the content switch happens afterwards.
if [ -z "$CURRENT_RELEASE" ]; then
  PROMOTION_STARTED=1
  atomic_release_link "$RELEASE_TARGET" "current" "$RELEASE_ID"
  SYMLINK_SWITCHED=1
fi

if [ "$CADDY_CHANGED" = "1" ] || [ "$COMPOSE_CHANGED" = "1" ]; then
  PROMOTION_STARTED=1
  CONFIG_PROMOTION_ATTEMPTED=1
  say "promoting validated routing configuration"

  if [ "$CADDY_CHANGED" = "1" ]; then
    remote_ssh "mv -Tf '$REMOTE_DIR/Caddyfile.next-$RELEASE_ID' '$REMOTE_DIR/Caddyfile'"
  fi
  if [ "$COMPOSE_CHANGED" = "1" ]; then
    remote_ssh "mv -Tf '$REMOTE_DIR/docker-compose.yml.next-$RELEASE_ID' '$REMOTE_DIR/docker-compose.yml'"
  fi

  remote_ssh "cd '$REMOTE_DIR' && docker compose up -d --no-deps --force-recreate inspr-www"
  ok "inspr-www recreated with validated configuration"
else
  ok "routing configuration unchanged"
fi

if [ "$SYMLINK_SWITCHED" != "1" ] && [ "$CURRENT_RELEASE" != "$RELEASE_TARGET" ]; then
  PROMOTION_STARTED=1
  atomic_release_link "$RELEASE_TARGET" "current" "$RELEASE_ID"
  SYMLINK_SWITCHED=1
fi

# Verify Caddy against the promoted symlink from inside the container before
# asking public DNS, TLS and Traefik to participate in the final smoke tests.
say "checking promoted release inside inspr-www"
remote_ssh "set -eu
  docker exec inspr-www caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
  attempt=0
  while [ \"\$attempt\" -lt 20 ]; do
    if docker exec inspr-www wget -qO- --header='Host: www.inspr.at' http://127.0.0.1/ | grep -Fq 'Ideas should outlive'; then
      exit 0
    fi
    attempt=\$((attempt + 1))
    sleep 1
  done
  exit 1" || die "promoted release failed the internal container check"
ok "promoted release is healthy inside Caddy"

# 7. Centralised, read-only smoke probes. Pages are checked for recognizable
# content, content type and security headers, not just a green status code.
# Exact auth responses prove Traefik still routes around the apex redirect.
if [ "${SKIP_PROBE:-}" = "1" ]; then
  ok "probes skipped (SKIP_PROBE=1)"
else
  say "probing live host routing"
  probe_page "INSPR umbrella" "https://www.inspr.at/" "Ideas should outlive" "text/html" "$RELEASE_ID"
  probe_page "Paimos microsite" "https://paimos.inspr.at/" "One shared project picture." "text/html" "$RELEASE_ID"
  probe_page "Pharos microsite" "https://pharos.inspr.at/" "Fleet truth before action." "text/html" "$RELEASE_ID"
  probe_page "Janus microsite" "https://janus.inspr.at/" "Use secrets. Keep values hidden." "text/html" "$RELEASE_ID"
  probe_page "v1 archive" "https://v1.inspr.at/" "Upstream of any substrate" "text/html"
  probe_page "shared product asset" "https://paimos.inspr.at$shared_asset_path" "" "text/css"
  probe_redirect "legacy edition redirect" "https://www.inspr.at/v1/" "301,302,307,308" "https://v1.inspr.at/v1/"
  probe_redirect "apex canonical redirect" "https://inspr.at/" "301,302,307,308" "https://www.inspr.at/"
  probe_page "identity entry route" "https://inspr.at/enter" "inspr.at" "text/html"
  probe_redirect "identity login route" "https://inspr.at/login" "302" "https://auth.inspr.at/"
  probe_redirect "apex HTTP upgrade" "http://inspr.at/" "301,302,307,308" "https://inspr.at/"
  probe_redirect "www HTTP upgrade" "http://www.inspr.at/" "301,302,307,308" "https://www.inspr.at/"
  probe_redirect "Paimos HTTP upgrade" "http://paimos.inspr.at/" "301,302,307,308" "https://paimos.inspr.at/"
  probe_redirect "Pharos HTTP upgrade" "http://pharos.inspr.at/" "301,302,307,308" "https://pharos.inspr.at/"
  probe_redirect "Janus HTTP upgrade" "http://janus.inspr.at/" "301,302,307,308" "https://janus.inspr.at/"
  probe_redirect "v1 HTTP upgrade" "http://v1.inspr.at/" "301,302,307,308" "https://v1.inspr.at/"
fi

# Only a fully probed release becomes the documented rollback target. All
# builds remain immutable, so operators can also select any older id manually.
if [ -n "$CURRENT_RELEASE" ] && [ "$CURRENT_RELEASE" != "$RELEASE_TARGET" ]; then
  atomic_release_link "$CURRENT_RELEASE" "previous" "$RELEASE_ID"
fi

PROMOTION_STARTED=0
trap - EXIT INT TERM
ok "deployment complete: $RELEASE_ID"
