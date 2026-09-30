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
# Runtime ownership: the inspr-www container (with inspr-auth, zitadel and
# zitadel-postgres) is declared in nixcfg hosts/csb1/docker/compose-spec.nix
# since OPS-136. deploy.sh writes release content and the bind-mounted
# Caddyfile only; it never reads, uploads or applies docker-compose.yml. A
# changed Caddyfile restarts the stateless inspr-www container so the fresh
# bind mount is picked up.
#
# The current Astro build contains the umbrella page plus /aithema, /paimos,
# /pharos and /janus. Caddy maps each product hostname to its folder and serves
# content-addressed /_astro files from the append-only shared asset pool.
# /paimos is the AEON page (INSPR-492); the retired Paimos page lives at
# www.inspr.at/paimos-legacy and /paimos-aeon only redirects to /paimos/.
#
# Env vars:
#   INSPR_AT_HOST       SSH alias or host (default: csb1)
#   INSPR_AT_SSH_PORT   optional SSH port (required when the host-key alias uses
#                       OpenSSH's bracketed [host]:port form)
#   INSPR_AT_SSH_HOSTNAME
#                       optional direct DNS name or IPv4 override; must be used
#                       together with INSPR_AT_SSH_HOST_KEY_ALIAS
#   INSPR_AT_SSH_HOST_KEY_ALIAS
#                       pinned known_hosts identity for a direct override
#   INSPR_AT_DIR        remote dir (default: /home/mba/docker/inspr-at)
#   SKIP_BUILD=1        reuse existing web/dist/
#   SKIP_PROBE=1        skip read-only post-deploy HTTPS probes
#   PROBE_TIMEOUT       maximum seconds per probe (default: 20)
#   PROBE_ATTEMPTS      attempts while routing converges (default: 20)
#   PROBE_RESOLVE_IP    optional IPv4 override for fresh-DNS cutover probes
#
# deploy.sh supplies INSPR_GIT_SHA, INSPR_GIT_DIRTY, INSPR_RELEASE_ID,
# INSPR_DEPLOYED_AT, INSPR_CALENDAR_VERSION, INSPR_RELEASE_SEQUENCE and
# INSPR_CALENDAR_ANCHOR only to the Astro build process. They are non-secret,
# allowlisted release evidence and are written into web/dist/release.json.
#
# INSPR Calendar Versioning (inspr-calver-3, INSPR-493): this script is the
# only place that reserves a release coordinate. It reads every sealed
# builds/*/release.json on the host, derives YYMMDDhhmmss.0.0 from the one UTC
# deployment timestamp and requires it to be strictly later than the channel's
# latest coordinate (waiting for the next second on a same-second collision).
# The release sequence continues from the highest one on the host, so a
# rollback never causes a reused version or sequence. Build nodes never derive
# a version from their own clocks; a direct local build carries none.
#
# Every calendar release is one immutable release set: web/dist/release-set.json
# enumerates each output file (its path is the artifact coordinate) with size
# and SHA-256, plus the full source commit and the web/package-lock.json
# digest. The host copies are verified against it before sealing, its digest
# is recorded in the append-only ledger releases/events.tsv, and a build is
# verified against that ledger digest again before any rollback relinks it.
# From the final history check through sealing, promotion and probes, one
# deployment holds the atomic remote lock releases/.deploy.lock (mkdir). A
# lock left by a killed run is never broken automatically; the script refuses
# and names its owner.
#
# ROLLBACK_TO=<YYMMDDhhmmss.0.0> rolls production back to that exact sealed
# calendar release instead of deploying: it verifies the build against its
# ledger digest under the lock, switches `current`, records a rollback event
# and probes. Release ordering and sequences are untouched. Builds sealed
# before the ledger existed (the legacy era) are not selectable this way.
#
# Releases are retained on the server. `previous` points at the prior healthy
# release; older immutable builds remain available for an operator-selected
# rollback. Production execution remains user-driven.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST="${INSPR_AT_HOST:-csb1}"
SSH_PORT="${INSPR_AT_SSH_PORT:-}"
SSH_HOSTNAME="${INSPR_AT_SSH_HOSTNAME:-}"
SSH_HOST_KEY_ALIAS="${INSPR_AT_SSH_HOST_KEY_ALIAS:-}"
REMOTE_DIR="${INSPR_AT_DIR:-/home/mba/docker/inspr-at}"
PROBE_TIMEOUT="${PROBE_TIMEOUT:-20}"
PROBE_ATTEMPTS="${PROBE_ATTEMPTS:-20}"
PROBE_RESOLVE_IP="${PROBE_RESOLVE_IP:-}"
REMOTE_RELEASE_ROOT="$REMOTE_DIR/releases"

PROMOTION_STARTED=0
SYMLINK_SWITCHED=0
CONFIG_PROMOTION_ATTEMPTED=0
INCOMING_CREATED=0
RELEASE_SEALED=0
CURRENT_RELEASE=""
RELEASE_ID=""
ROLLBACK_DIR=""
REMOTE_INCOMING=""
REMOTE_LOCK="$REMOTE_RELEASE_ROOT/.deploy.lock"
REMOTE_EVENTS="$REMOTE_RELEASE_ROOT/events.tsv"
LOCK_HELD=0
LOCK_TOKEN=""
RELEASE_SET_DIGEST=""
CALENDAR_VERSION=""
MANIFEST_RELEASE_SEQUENCE=""
ROLLBACK_TO="${ROLLBACK_TO:-}"

say() { printf '\033[1;36m->\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32mOK\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR\033[0m %s\n' "$*" >&2; exit 1; }

SSH_ARGS=(-o BatchMode=yes -o ConnectTimeout=10)
SCP_ARGS=(-o BatchMode=yes -o ConnectTimeout=10)
RSYNC_SSH="ssh -o BatchMode=yes -o ConnectTimeout=10"

[[ "$HOST" =~ ^[[:alnum:]][[:alnum:].@:_-]*$ ]] || die "unsafe INSPR_AT_HOST value"

if [ -n "$SSH_HOSTNAME" ] || [ -n "$SSH_HOST_KEY_ALIAS" ]; then
  [ -n "$SSH_HOSTNAME" ] && [ -n "$SSH_HOST_KEY_ALIAS" ] || \
    die "INSPR_AT_SSH_HOSTNAME and INSPR_AT_SSH_HOST_KEY_ALIAS must be set together"
  [[ "$SSH_HOSTNAME" =~ ^[[:alnum:]]([[:alnum:]._-]*[[:alnum:]])?$ ]] || \
    die "INSPR_AT_SSH_HOSTNAME must be a DNS name or IPv4 address"
  [[ "$SSH_HOSTNAME" != *..* ]] || \
    die "INSPR_AT_SSH_HOSTNAME cannot contain consecutive dots"
  if [[ "$SSH_HOST_KEY_ALIAS" =~ ^[[:alnum:]]([[:alnum:]._-]*[[:alnum:]])?$ ]]; then
    :
  elif [[ "$SSH_HOST_KEY_ALIAS" =~ ^\[[[:alnum:]]([[:alnum:]._-]*[[:alnum:]])?\]:[0-9]{1,5}$ ]]; then
    SSH_HOST_KEY_ALIAS_PORT="${SSH_HOST_KEY_ALIAS##*:}"
    [ "$SSH_HOST_KEY_ALIAS_PORT" -ge 1 ] && [ "$SSH_HOST_KEY_ALIAS_PORT" -le 65535 ] || \
      die "INSPR_AT_SSH_HOST_KEY_ALIAS port must be between 1 and 65535"
  else
    die "INSPR_AT_SSH_HOST_KEY_ALIAS contains unsafe characters"
  fi
  [[ "$SSH_HOST_KEY_ALIAS" != *..* ]] || \
    die "INSPR_AT_SSH_HOST_KEY_ALIAS cannot contain consecutive dots"

  SSH_ARGS+=(
    -o StrictHostKeyChecking=yes
    -o "Hostname=$SSH_HOSTNAME"
    -o "HostKeyAlias=$SSH_HOST_KEY_ALIAS"
  )
  SCP_ARGS+=(
    -o StrictHostKeyChecking=yes
    -o "Hostname=$SSH_HOSTNAME"
    -o "HostKeyAlias=$SSH_HOST_KEY_ALIAS"
  )
  RSYNC_SSH+=" -o StrictHostKeyChecking=yes -o Hostname=$SSH_HOSTNAME -o HostKeyAlias=$SSH_HOST_KEY_ALIAS"
fi

if [ -n "$SSH_PORT" ]; then
  [[ "$SSH_PORT" =~ ^[0-9]+$ ]] || die "INSPR_AT_SSH_PORT must be numeric"
  [ "$SSH_PORT" -ge 1 ] && [ "$SSH_PORT" -le 65535 ] || \
    die "INSPR_AT_SSH_PORT must be between 1 and 65535"
  SSH_ARGS+=(-p "$SSH_PORT")
  SCP_ARGS+=(-P "$SSH_PORT")
  RSYNC_SSH+=" -p $SSH_PORT"
fi

if [ -n "${SSH_HOST_KEY_ALIAS_PORT:-}" ]; then
  [ -n "$SSH_PORT" ] || \
    die "INSPR_AT_SSH_PORT is required for a bracketed INSPR_AT_SSH_HOST_KEY_ALIAS"
  [ "$SSH_HOST_KEY_ALIAS_PORT" -eq "$SSH_PORT" ] || \
    die "INSPR_AT_SSH_PORT must match the bracketed INSPR_AT_SSH_HOST_KEY_ALIAS port"
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

# Print every sealed release manifest on the host as "--- <build-id>" followed
# by its release.json. Read-only; an absent builds/ directory prints nothing.
read_release_inventory() {
  remote_ssh "set -eu
    cd '$REMOTE_RELEASE_ROOT/builds' 2>/dev/null || exit 0
    for manifest in */release.json; do
      [ -f \"\$manifest\" ] || continue
      printf -- '--- %s\\n' \"\${manifest%/release.json}\"
      cat \"\$manifest\"
      printf '\\n'
    done"
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
const calendarVersion = manifest?.version?.value;
const releaseSequence = manifest?.version?.sequence;

if (manifest?.schemaVersion !== 2) throw new Error("unsupported release manifest schema");
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
// Full scheme, date and history checks run in web/scripts/calendar-reservation.mjs.
if (manifest?.version?.scheme !== "inspr-calver-3" || typeof calendarVersion !== "string") {
  throw new Error("release manifest declares no inspr-calver-3 version");
}
if (!Number.isSafeInteger(releaseSequence) || releaseSequence < 1) {
  throw new Error("release manifest has no release sequence");
}

process.stdout.write([
  releaseId,
  deployedAt,
  gitRevision.toLowerCase(),
  gitDirty ? "1" : "0",
  version,
  calendarVersion,
  String(releaseSequence),
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

# Atomic remote deployment lock. mkdir either creates the directory or fails,
# so exactly one run holds it. The owner token names this machine, process and
# release. A stale lock is reported with its owner and never broken here.
acquire_deploy_lock() {
  local label owner status
  label="$(hostname 2>/dev/null || true)"
  [[ "$label" =~ ^[[:alnum:]._-]{1,64}$ ]] || label="local"
  LOCK_TOKEN="$label:$$:${1:-deploy}:$(date -u +%Y%m%dT%H%M%SZ)"
  [[ "$LOCK_TOKEN" =~ ^[[:alnum:]._:-]+$ ]] || die "unsafe deployment lock token"
  set +e
  owner=$(remote_ssh "set -eu
    mkdir -p '$REMOTE_RELEASE_ROOT'
    if mkdir '$REMOTE_LOCK' 2>/dev/null; then
      printf '%s\n' '$LOCK_TOKEN' > '$REMOTE_LOCK/owner'
      exit 0
    fi
    cat '$REMOTE_LOCK/owner' 2>/dev/null || printf 'owner unknown\n'
    exit 73")
  status=$?
  set -e
  if [ "$status" = "0" ]; then
    LOCK_HELD=1
    ok "deployment lock acquired ($LOCK_TOKEN)"
  elif [ "$status" = "73" ]; then
    die "another deployment holds $REMOTE_LOCK (${owner//$'\n'/ }); if none is running, inspect the host and remove that directory by hand"
  else
    die "unable to acquire the deployment lock $REMOTE_LOCK"
  fi
}

# Release only a lock this run owns; never remove somebody else's.
release_deploy_lock() {
  [ "$LOCK_HELD" = "1" ] || return 0
  if remote_ssh "set -eu
    [ \"\$(cat '$REMOTE_LOCK/owner' 2>/dev/null)\" = '$LOCK_TOKEN' ] || exit 74
    rm -f -- '$REMOTE_LOCK/owner'
    rmdir -- '$REMOTE_LOCK'"; then
    LOCK_HELD=0
  else
    printf '\033[1;31mERROR\033[0m deployment lock %s was not released; inspect it before the next deploy\n' "$REMOTE_LOCK" >&2
  fi
}

# Print one build directory on the host for release-set verification: the
# manifest bytes (base64), any non-regular entry, and the host's own SHA-256
# of every other regular file.
remote_release_listing() {
  local directory="$1"
  remote_ssh "set -eu
    cd '$directory'
    if [ -f release-set.json ] && [ ! -L release-set.json ]; then
      printf 'manifest %s\n' \"\$(base64 -w0 release-set.json)\"
    else
      printf 'manifest-missing\n'
    fi
    find . -mindepth 1 ! -type f ! -type d -print | sed 's/^/other /'
    find . -type f ! -path ./release-set.json -print0 | LC_ALL=C sort -z | xargs -0 -r sha256sum | sed 's/^/file /'"
}

# Append one event to the host's release ledger. Values are validated here
# because they are embedded in the remote command.
record_release_event() {
  local event="$1" id="$2" version="$3" sequence="$4" digest="$5"
  [[ "$event" =~ ^(sealed|promoted|auto-rollback|rollback)$ ]] && [[ "$id" =~ ^[[:alnum:]._-]+$ ]] \
    && [[ "$version" =~ ^[1-9][0-9]{11}\.0\.0$ ]] && [[ "$sequence" =~ ^[1-9][0-9]*$ ]] \
    && [[ "$digest" =~ ^[0-9a-f]{64}$ ]] || return 1
  remote_ssh "set -eu
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" '$event' '$id' '$version' '$sequence' '$digest' >> '$REMOTE_EVENTS'"
}

# Verify one sealed build ("builds/<id>") against the release-set digest its
# ledger entry recorded at sealing. Prints "version<TAB>sequence<TAB>digest".
# Exit 4: the build predates the ledger (legacy era), so nothing can verify it.
verify_sealed_build() {
  local target="$1" id events entry status version sequence digest
  id="${target#builds/}"
  [[ "$target" =~ ^builds/[[:alnum:]_.-]+$ ]] || return 1
  events=$(remote_ssh "cat '$REMOTE_EVENTS' 2>/dev/null || true") || return 1
  entry=$(printf '%s' "$events" | node "$ROOT/web/scripts/release-set.mjs" lookup "$id")
  status=$?
  if [ "$status" = "4" ]; then
    # Without a ledger entry only a build that carries no release set is legacy.
    remote_ssh "test ! -e '$REMOTE_RELEASE_ROOT/$target/release-set.json'" && return 4
    return 1
  fi
  [ "$status" = "0" ] || return 1
  IFS=$'\t' read -r _ version sequence digest <<<"$entry"
  remote_release_listing "$REMOTE_RELEASE_ROOT/$target" | \
    node "$ROOT/web/scripts/release-set.mjs" verify "$digest" "$id" "$version" >/dev/null || return 1
  printf '%s\t%s\t%s\n' "$version" "$sequence" "$digest"
}

# The promoted release must answer inside the container before the public
# probes run.
check_promoted_release() {
  say "checking promoted release inside inspr-www"
  remote_ssh "set -eu
    docker exec inspr-www caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
    attempt=0
    while [ \"\$attempt\" -lt 20 ]; do
      if docker exec inspr-www wget -qO- --header='Host: www.inspr.at' http://127.0.0.1/ | grep -Fq 'Inspiration is the only limit.' &&
         docker exec inspr-www wget -qO- --header='Host: aithema.inspr.at' http://127.0.0.1/ | grep -Fq 'Requirements you approve before work begins.'; then
        exit 0
      fi
      attempt=\$((attempt + 1))
      sleep 1
    done
    exit 1" || die "promoted release failed the internal container check"
  ok "promoted release is healthy inside Caddy"
}

rollback_deployment() {
  set +e
  local verified status rollback_version rollback_sequence rollback_digest
  printf '\033[1;33mROLLBACK\033[0m restoring the last known deployment\n' >&2

  if [ "$SYMLINK_SWITCHED" = "1" ]; then
    if [ -n "$CURRENT_RELEASE" ]; then
      # Relink only a build that still matches its sealed release set. A
      # legacy build (sealed before the ledger) has no release set to check.
      verified=$(verify_sealed_build "$CURRENT_RELEASE")
      status=$?
      if [ "$status" = "0" ]; then
        atomic_release_link "$CURRENT_RELEASE" "current" "${RELEASE_ID}-rollback" && {
          IFS=$'\t' read -r rollback_version rollback_sequence rollback_digest <<<"$verified"
          record_release_event auto-rollback "${CURRENT_RELEASE#builds/}" "$rollback_version" \
            "$rollback_sequence" "$rollback_digest" || \
            printf '\033[1;31mERROR\033[0m rollback event was not recorded in %s\n' "$REMOTE_EVENTS" >&2
          printf '\033[1;33mROLLBACK\033[0m restored %s (release set verified)\n' "$CURRENT_RELEASE" >&2
        }
      elif [ "$status" = "4" ]; then
        printf '\033[1;33mROLLBACK\033[0m %s predates release sets; relinking it unverified\n' "$CURRENT_RELEASE" >&2
        atomic_release_link "$CURRENT_RELEASE" "current" "${RELEASE_ID}-rollback"
      else
        printf '\033[1;31mERROR\033[0m %s does not match its sealed release set; current was NOT relinked and needs operator attention\n' "$CURRENT_RELEASE" >&2
      fi
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
      mv -Tf '$REMOTE_DIR/Caddyfile.rollback-$RELEASE_ID' '$REMOTE_DIR/Caddyfile'" || \
      printf '\033[1;31mERROR\033[0m automatic Caddyfile rollback needs operator attention\n' >&2

    # nixcfg owns the container; a restart re-binds the restored file.
    remote_ssh "docker restart inspr-www >/dev/null" || \
      printf '\033[1;31mERROR\033[0m automatic web edge rollback needs operator attention\n' >&2
  fi

  if [ -n "$ROLLBACK_TO" ]; then
    printf '\033[1;33mROLLBACK\033[0m the requested rollback to %s was reverted\n' "$ROLLBACK_TO" >&2
  else
    printf '\033[1;33mROLLBACK\033[0m failed release retained as builds/%s\n' "$RELEASE_ID" >&2
  fi
}

on_exit() {
  local status=$?
  trap - EXIT INT TERM

  if [ "$status" -ne 0 ] && [ "$PROMOTION_STARTED" = "1" ]; then
    rollback_deployment
  fi

  # A failed run must not leave its unreachable, checksum-unverified upload
  # behind. Only the directory this run created is touched, and only when it
  # was never sealed into builds/.
  if [ "$status" -ne 0 ] && [ "$INCOMING_CREATED" = "1" ] && [ "$RELEASE_SEALED" != "1" ] \
    && [ -n "$RELEASE_ID" ] && [ "$REMOTE_INCOMING" = "$REMOTE_RELEASE_ROOT/.incoming-$RELEASE_ID" ]; then
    if remote_ssh "if [ -d '$REMOTE_INCOMING' ]; then rm -rf -- '$REMOTE_INCOMING'; fi" 2>/dev/null; then
      printf '\033[1;33mCLEANUP\033[0m removed unsealed upload %s\n' "$REMOTE_INCOMING" >&2
    else
      printf '\033[1;33mCLEANUP\033[0m unsealed upload left at %s\n' "$REMOTE_INCOMING" >&2
    fi
  fi

  release_deploy_lock
  exit "$status"
}

trap on_exit EXIT
trap 'exit 130' INT TERM

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
      if [ "$code" = "200" ] && \
        printf '%s\n' "$headers" | tr -d '\r' | grep -qi '^strict-transport-security:[[:space:]]*max-age='; then
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
  if [ "$matched" != "1" ]; then
    if [ "$code" = "200" ]; then
      die "$label -> Strict-Transport-Security missing after $PROBE_ATTEMPTS attempts"
    fi
    die "$label -> ${code:-unknown} (expected 200 after $PROBE_ATTEMPTS attempts)"
  fi

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
  printf '%s\n' "$headers" | tr -d '\r' | grep -qi '^strict-transport-security:[[:space:]]*max-age=' || \
    die "$label -> Strict-Transport-Security missing"

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
  local require_hsts="${5:-0}"
  local headers
  local code
  local location
  local attempt=1
  local matched=0

  while [ "$attempt" -le "$PROBE_ATTEMPTS" ]; do
    if headers=$(probe_headers "$url"); then
      code=$(printf '%s\n' "$headers" | tr -d '\r' | awk '/^HTTP\// { value=$2 } END { print value }')
      case ",$expected_codes," in
        *",$code,"*)
          if [ "$require_hsts" != "1" ] || \
            printf '%s\n' "$headers" | tr -d '\r' | grep -qi '^strict-transport-security:[[:space:]]*max-age='; then
            matched=1
            break
          fi
          ;;
      esac
    else
      code="request failed"
    fi
    [ "$attempt" -lt "$PROBE_ATTEMPTS" ] || break
    sleep 1
    attempt=$((attempt + 1))
  done
  if [ "$matched" != "1" ]; then
    if [ "$require_hsts" = "1" ]; then
      case ",$expected_codes," in
        *",$code,"*) die "$label -> Strict-Transport-Security missing after $PROBE_ATTEMPTS attempts" ;;
      esac
    fi
    die "$label -> ${code:-unknown} (expected $expected_codes after $PROBE_ATTEMPTS attempts)"
  fi

  location=$(printf '%s\n' "$headers" | tr -d '\r' | awk '
    tolower($1) == "location:" { value=$2 }
    END { print value }
  ')
  [[ "$location" == "$expected_location_prefix"* ]] || \
    die "$label -> unexpected redirect target"

  if [ "$require_hsts" = "1" ]; then
    printf '%s\n' "$headers" | tr -d '\r' | grep -qi '^strict-transport-security:[[:space:]]*max-age=' || \
      die "$label -> Strict-Transport-Security missing"
  fi

  ok "$label -> $code, target verified"
}

# 0. ROLLBACK_TO: return production to one exact sealed calendar release.
if [ -n "$ROLLBACK_TO" ]; then
  [[ "$ROLLBACK_TO" =~ ^[1-9][0-9](0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])([01][0-9]|2[0-3])[0-5][0-9][0-5][0-9]\.0\.0$ ]] || \
    die "ROLLBACK_TO must be a canonical calendar version (YYMMDDhhmmss.0.0)"
  RELEASE_ID="rollback-${ROLLBACK_TO%.0.0}"
  acquire_deploy_lock "$RELEASE_ID"

  ROLLBACK_ENTRY=$(remote_ssh "cat '$REMOTE_EVENTS' 2>/dev/null || true" | \
    node "$ROOT/web/scripts/release-set.mjs" lookup "$ROLLBACK_TO") || \
    die "$ROLLBACK_TO is not a sealed calendar release in $REMOTE_EVENTS"
  IFS=$'\t' read -r ROLLBACK_RELEASE_ID _ ROLLBACK_SEQUENCE ROLLBACK_DIGEST <<<"$ROLLBACK_ENTRY"
  ROLLBACK_TARGET="builds/$ROLLBACK_RELEASE_ID"
  verify_sealed_build "$ROLLBACK_TARGET" >/dev/null || \
    die "$ROLLBACK_TARGET does not match its sealed release set; refusing to roll back to it"
  ok "rollback target $ROLLBACK_TO ($ROLLBACK_TARGET) matches release set ${ROLLBACK_DIGEST:0:12}"

  CURRENT_RELEASE=$(remote_ssh "set -eu
    if [ -L '$REMOTE_RELEASE_ROOT/current' ]; then
      readlink '$REMOTE_RELEASE_ROOT/current'
    fi")
  [[ "$CURRENT_RELEASE" =~ ^builds/[[:alnum:]_.-]+$ ]] || die "remote current link has an unexpected target"
  [ "$CURRENT_RELEASE" != "$ROLLBACK_TARGET" ] || die "$ROLLBACK_TO is already current"

  # A failed health check restores the release that was live before.
  PROMOTION_STARTED=1
  atomic_release_link "$ROLLBACK_TARGET" "current" "$RELEASE_ID"
  SYMLINK_SWITCHED=1
  record_release_event rollback "$ROLLBACK_RELEASE_ID" "$ROLLBACK_TO" "$ROLLBACK_SEQUENCE" "$ROLLBACK_DIGEST" || \
    die "rollback event could not be recorded"
  check_promoted_release
  if [ "${SKIP_PROBE:-}" != "1" ]; then
    probe_page "INSPR umbrella after rollback" "https://www.inspr.at/" "Inspiration is the only limit." "text/html" "$ROLLBACK_RELEASE_ID"
    probe_page "release manifest after rollback" "https://www.inspr.at/release.json" "\"value\": \"$ROLLBACK_TO\"" "application/json"
  fi
  atomic_release_link "$CURRENT_RELEASE" "previous" "$RELEASE_ID"
  PROMOTION_STARTED=0
  release_deploy_lock
  trap - EXIT INT TERM
  ok "rolled back to $ROLLBACK_TO ($ROLLBACK_TARGET); release ordering unchanged"
  exit 0
fi

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

  # Reserve the calendar coordinate once from the deployment timestamp. It
  # must be strictly later than every coordinate already sealed on the host;
  # a same-second collision waits for the next second instead of inventing a
  # tie-breaker. A larger gap means a skewed clock and fails closed.
  say "reserving the calendar version against the host's release history"
  RELEASE_INVENTORY="$(read_release_inventory)" || \
    die "unable to read the host's release history; refusing to reserve a version"
  RESERVATION=""
  for reservation_attempt in 1 2 3 4 5 6; do
    set +e
    RESERVATION=$(printf '%s' "$RELEASE_INVENTORY" | \
      node "$ROOT/web/scripts/calendar-reservation.mjs" reserve "$DEPLOYED_AT")
    reservation_status=$?
    set -e
    [ "$reservation_status" = "0" ] && break
    [ "$reservation_status" = "3" ] && [ "$reservation_attempt" -lt 6 ] || \
      die "calendar version reservation failed"
    sleep 1
    DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  done
  IFS=$'\t' read -r CALENDAR_VERSION RELEASE_SEQUENCE CALENDAR_ANCHOR <<<"$RESERVATION"
  [[ "$CALENDAR_VERSION" =~ ^[1-9][0-9](0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])([01][0-9]|2[0-3])[0-5][0-9][0-5][0-9]\.0\.0$ ]] || \
    die "reserved calendar version is not canonical"
  ok "reserved calendar version $CALENDAR_VERSION (inspr-calver-3, sequence $RELEASE_SEQUENCE)"

  RELEASE_TIMESTAMP="${DEPLOYED_AT//[-:]/}"
  RELEASE_ID="$RELEASE_TIMESTAMP-$GIT_SHORT"

  say "building Astro microsites"
  (
    cd "$ROOT/web"
    INSPR_GIT_SHA="$GIT_SHA" \
      INSPR_GIT_DIRTY="$GIT_DIRTY" \
      INSPR_RELEASE_ID="$RELEASE_ID" \
      INSPR_DEPLOYED_AT="$DEPLOYED_AT" \
      INSPR_CALENDAR_VERSION="$CALENDAR_VERSION" \
      INSPR_RELEASE_SEQUENCE="$RELEASE_SEQUENCE" \
      INSPR_CALENDAR_ANCHOR="$CALENDAR_ANCHOR" \
      npm run build
  )
fi

# 2. Reject unpinned inline scripts before any remote write.
say "verifying CSP hashes"
python3 "$ROOT/web/scripts/verify-csp.py"

# 3. Confirm the one-build/five-site output contract.
required_documents=(
  "index.html"
  "overview/index.html"
  "de/ueberblick/index.html"
  "paimos/index.html"
  "paimos/de/index.html"
  "paimos-legacy/index.html"
  "paimos-legacy/de/index.html"
  "paimos-aeon/index.html"
  "paimos-aeon/de/index.html"
  "pharos/index.html"
  "pharos/de/index.html"
  "janus/index.html"
  "janus/de/index.html"
  "release.json"
)
if [ -d "$ROOT/web/src/pages/aithema" ]; then
  required_documents+=("aithema/index.html" "aithema/de/index.html")
fi
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
  MANIFEST_GIT_DIRTY MANIFEST_VERSION MANIFEST_CALENDAR_VERSION \
  MANIFEST_RELEASE_SEQUENCE <<<"$MANIFEST_FIELDS"

if [ "${SKIP_BUILD:-}" != "1" ]; then
  [ "$MANIFEST_RELEASE_ID" = "$RELEASE_ID" ] || die "release id changed during the build"
  [ "$MANIFEST_DEPLOYED_AT" = "$DEPLOYED_AT" ] || die "deployment timestamp changed during the build"
  [ "$MANIFEST_GIT_SHA" = "${GIT_SHA:0:12}" ] || die "Git revision changed during the build"
  [ "$MANIFEST_GIT_DIRTY" = "$GIT_DIRTY" ] || die "Git state changed during the build"
  [ "$MANIFEST_CALENDAR_VERSION" = "$CALENDAR_VERSION" ] || die "calendar version changed during the build"
  [ "$MANIFEST_RELEASE_SEQUENCE" = "$RELEASE_SEQUENCE" ] || die "release sequence changed during the build"
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

# 4. Enumerate the immutable release set: every output file with its size and
# SHA-256, the full source commit and the dependency-lock digest. It is sealed
# with the build; its digest goes into the host ledger at sealing.
RELEASE_SET_DIGEST=$(node "$ROOT/web/scripts/release-set.mjs" create \
  "$ROOT/web/dist" "$CURRENT_GIT_SHA" "$ROOT/web/package-lock.json") || \
  die "release-set manifest could not be created"
[[ "$RELEASE_SET_DIGEST" =~ ^[0-9a-f]{64}$ ]] || die "release-set digest is invalid"
ok "release set ${RELEASE_SET_DIGEST:0:12} enumerates the build"

# Fingerprint the rendered content. The release id already embedded in the
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

# From here through sealing, promotion and probes exactly one deployment may
# act on the host; a concurrent run stops at this lock instead of racing.
acquire_deploy_lock "$RELEASE_ID"

# Re-read the host history right before the first write, under the lock. This
# also covers SKIP_BUILD=1 and any release sealed while this build ran: the
# manifest must be exactly the channel's next calendar version, sequence and
# anchor.
RELEASE_INVENTORY="$(read_release_inventory)" || \
  die "unable to read the host's release history before upload"
printf '%s' "$RELEASE_INVENTORY" | \
  node "$ROOT/web/scripts/calendar-reservation.mjs" verify "$ROOT/web/dist/release.json" >/dev/null || \
  die "calendar version $MANIFEST_CALENDAR_VERSION is not the channel's next release; rebuild to reserve a new one"
CALENDAR_VERSION="$MANIFEST_CALENDAR_VERSION"
ok "calendar version $CALENDAR_VERSION (sequence $MANIFEST_RELEASE_SEQUENCE) is later than every release on the host"

# A non-symlink `current` is an unknown layout and must never be overwritten.
remote_ssh "set -eu
  mkdir -p '$REMOTE_RELEASE_ROOT/builds' '$REMOTE_RELEASE_ROOT/assets/_astro' '$REMOTE_RELEASE_ROOT/rollbacks'
  if [ -e '$REMOTE_RELEASE_ROOT/current' ] && [ ! -L '$REMOTE_RELEASE_ROOT/current' ]; then
    exit 41
  fi
  test ! -e '$REMOTE_INCOMING'
  test ! -e '$REMOTE_RELEASE'
  mkdir '$REMOTE_INCOMING'" || die "remote release layout is unsafe or release id already exists"
INCOMING_CREATED=1

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

if [ -d "$ROOT/web/src/pages/aithema" ]; then
  remote_ssh "test -f '$REMOTE_INCOMING/aithema/index.html'" || \
    die "uploaded release is missing Aithema"
fi

# The host's own digests of the upload must match the release set exactly:
# no missing, extra, altered or non-regular files, and the same manifest.
remote_release_listing "$REMOTE_INCOMING" | \
  node "$ROOT/web/scripts/release-set.mjs" verify "$RELEASE_SET_DIGEST" "$RELEASE_ID" "$CALENDAR_VERSION" >/dev/null || \
  die "the uploaded release does not match its release set"
ok "uploaded release matches release set ${RELEASE_SET_DIGEST:0:12}"

# Record the release-set digest in the ledger before sealing: a build that is
# sealed without its ledger entry could never be verified for a rollback.
record_release_event sealed "$RELEASE_ID" "$CALENDAR_VERSION" "$MANIFEST_RELEASE_SEQUENCE" "$RELEASE_SET_DIGEST" || \
  die "unable to record the release set in $REMOTE_EVENTS"

remote_ssh "set -eu
  test -f '$REMOTE_INCOMING/index.html'
  test -f '$REMOTE_INCOMING/paimos/index.html'
  test -f '$REMOTE_INCOMING/paimos/de/index.html'
  test -f '$REMOTE_INCOMING/paimos-legacy/index.html'
  test -f '$REMOTE_INCOMING/paimos-legacy/de/index.html'
  test -f '$REMOTE_INCOMING/paimos-aeon/index.html'
  test -f '$REMOTE_INCOMING/pharos/index.html'
  test -f '$REMOTE_INCOMING/pharos/de/index.html'
  test -f '$REMOTE_INCOMING/janus/index.html'
  test -f '$REMOTE_INCOMING/janus/de/index.html'
  test -f '$REMOTE_INCOMING/release-set.json'
  test -n \"\$(find '$REMOTE_INCOMING/_astro' -maxdepth 1 -type f -name '*.css' -print -quit)\"
  mv '$REMOTE_INCOMING' '$REMOTE_RELEASE'"
RELEASE_SEALED=1
ok "release uploaded, checksum-verified and sealed"

# 6. Stage and validate the routing configuration before promotion. Only the
# bind-mounted Caddyfile is deployable from here (see the ownership note in
# the header).
LOCAL_CADDY_HASH=$(shasum -a 256 "$ROOT/Caddyfile" | awk '{print $1}')
REMOTE_CADDY_HASH=$(remote_hash "Caddyfile")

CADDY_CHANGED=0

if [ "$LOCAL_CADDY_HASH" != "$REMOTE_CADDY_HASH" ]; then
  CADDY_CHANGED=1
  say "staging and validating Caddyfile"
  remote_scp -q "$ROOT/Caddyfile" "$HOST:$REMOTE_DIR/Caddyfile.next-$RELEASE_ID"
  remote_ssh \
    "docker run --rm --network none -v '$REMOTE_DIR/Caddyfile.next-$RELEASE_ID:/etc/caddy/Caddyfile:ro' caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null"
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

# Preserve the live Caddyfile before it is promoted. A single-file bind mount
# follows its inode, so a Caddyfile change restarts the stateless site
# container (bind mounts are re-resolved on start) instead of relying on a
# reload after the atomic rename.
if [ "$CADDY_CHANGED" = "1" ]; then
  remote_ssh "set -eu
    mkdir -p '$ROLLBACK_DIR'
    cp -p '$REMOTE_DIR/Caddyfile' '$ROLLBACK_DIR/Caddyfile'"
fi

# On the first cutover the old container still serves site/. Seed `current`
# before its compose file changes. On repeat deploys the old release stays live
# through any container recreation and the content switch happens afterwards.
if [ -z "$CURRENT_RELEASE" ]; then
  PROMOTION_STARTED=1
  atomic_release_link "$RELEASE_TARGET" "current" "$RELEASE_ID"
  SYMLINK_SWITCHED=1
fi

if [ "$CADDY_CHANGED" = "1" ]; then
  PROMOTION_STARTED=1
  CONFIG_PROMOTION_ATTEMPTED=1
  say "promoting validated Caddyfile"
  remote_ssh "mv -Tf '$REMOTE_DIR/Caddyfile.next-$RELEASE_ID' '$REMOTE_DIR/Caddyfile'"

  # nixcfg owns the container definition, so the edge is never recreated from
  # here. A restart is enough: bind mounts are re-resolved on start, which
  # picks up the renamed file's new inode.
  remote_ssh "docker restart inspr-www >/dev/null"
  ok "inspr-www restarted with validated edge configuration"
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
check_promoted_release

# 7. Centralised, read-only smoke probes. Pages are checked for recognizable
# content, content type and security headers, not just a green status code.
# Exact auth responses prove Traefik still routes around the apex redirect.
if [ "${SKIP_PROBE:-}" = "1" ]; then
  ok "probes skipped (SKIP_PROBE=1)"
else
  say "probing live host routing"
  probe_page "INSPR umbrella" "https://www.inspr.at/" "Inspiration is the only limit." "text/html" "$RELEASE_ID"
  probe_page "INSPR overview" "https://www.inspr.at/overview/" "From an idea to something that" "text/html"
  probe_page "INSPR German overview" "https://www.inspr.at/de/ueberblick/" "Von einer Idee zu etwas" "text/html"
  probe_page "INSPR umbrella details control" "https://www.inspr.at/" "data-details-slider" "text/html"
  probe_page "INSPR German umbrella details control" "https://www.inspr.at/de/" "data-details-slider" "text/html"
  probe_page "INSPR overview details switch" "https://www.inspr.at/overview/" "data-details-slider" "text/html"
  probe_page "INSPR German overview details switch" "https://www.inspr.at/de/ueberblick/" "data-details-slider" "text/html"
  probe_page "Aithema details control" "https://aithema.inspr.at/" "data-details-slider" "text/html"
  probe_page "Aithema German details control" "https://aithema.inspr.at/de/" "data-details-slider" "text/html"
  probe_page "Paimos details control" "https://paimos.inspr.at/" "data-details-slider" "text/html"
  probe_page "Paimos German details control" "https://paimos.inspr.at/de/" "data-details-slider" "text/html"
  probe_page "Pharos details control" "https://pharos.inspr.at/" "data-details-slider" "text/html"
  probe_page "Pharos German details control" "https://pharos.inspr.at/de/" "data-details-slider" "text/html"
  probe_page "Janus details control" "https://janus.inspr.at/" "data-details-slider" "text/html"
  probe_page "Janus German details control" "https://janus.inspr.at/de/" "data-details-slider" "text/html"
  probe_page "Aithema microsite" "https://aithema.inspr.at/" "Requirements you approve before work begins." "text/html" "$RELEASE_ID"
  probe_page "Aithema German microsite" "https://aithema.inspr.at/de/" "Anforderungen, die Sie vor Arbeitsbeginn freigeben." "text/html" "$RELEASE_ID"
  probe_page "Paimos microsite" "https://paimos.inspr.at/" "Your agents. Your machines." "text/html" "$RELEASE_ID"
  probe_page "Paimos German microsite" "https://paimos.inspr.at/de/" "Ihre Agenten. Ihre Rechner." "text/html" "$RELEASE_ID"
  probe_page "Paimos on the www host" "https://www.inspr.at/paimos/" "Your agents. Your machines." "text/html" "$RELEASE_ID"
  probe_page "Paimos German on the www host" "https://www.inspr.at/paimos/de/" "Ihre Agenten. Ihre Rechner." "text/html" "$RELEASE_ID"
  probe_page "Paimos legacy page" "https://www.inspr.at/paimos-legacy/" "One shared project picture." "text/html" "$RELEASE_ID"
  probe_page "Paimos legacy German page" "https://www.inspr.at/paimos-legacy/de/" "Ein gemeinsames Projektbild." "text/html" "$RELEASE_ID"
  probe_page "Paimos legacy stays unindexed" "https://www.inspr.at/paimos-legacy/" 'name="robots" content="noindex, follow"' "text/html"
  probe_page "old AEON preview URL redirects" "https://www.inspr.at/paimos-aeon/" "/paimos/" "text/html"
  probe_page "Pharos microsite" "https://pharos.inspr.at/" "Fleet truth before action." "text/html" "$RELEASE_ID"
  probe_page "Pharos German microsite" "https://pharos.inspr.at/de/" "Flottenwahrheit vor Aktion." "text/html" "$RELEASE_ID"
  probe_page "Janus microsite" "https://janus.inspr.at/" "Use secrets. Keep values hidden." "text/html" "$RELEASE_ID"
  probe_page "Janus German microsite" "https://janus.inspr.at/de/" "Geheimnisse nutzen. Werte verbergen." "text/html" "$RELEASE_ID"
  probe_page "v1 archive" "https://v1.inspr.at/" "Upstream of any substrate" "text/html"
  probe_page "release manifest scheme" "https://www.inspr.at/release.json" '"scheme": "inspr-calver-3"' "application/json"
  probe_page "release manifest calendar version" "https://www.inspr.at/release.json" "\"value\": \"$CALENDAR_VERSION\"" "application/json"
  probe_page "release set" "https://www.inspr.at/release-set.json" "\"value\": \"$CALENDAR_VERSION\"" "application/json"
  probe_page "umbrella footer calendar version" "https://www.inspr.at/" "data-calendar-version=\"$CALENDAR_VERSION\"" "text/html"
  probe_page "Paimos footer calendar version" "https://paimos.inspr.at/" "data-calendar-version=\"$CALENDAR_VERSION\"" "text/html"
  probe_page "Aithema footer calendar version" "https://aithema.inspr.at/" "data-calendar-version=\"$CALENDAR_VERSION\"" "text/html"
  probe_page "overview footer calendar version" "https://www.inspr.at/overview/" "data-calendar-version=\"$CALENDAR_VERSION\"" "text/html"
  probe_page "German overview footer calendar version" "https://www.inspr.at/de/ueberblick/" "data-calendar-version=\"$CALENDAR_VERSION\"" "text/html"
  probe_page "shared product asset" "https://paimos.inspr.at$shared_asset_path" "" "text/css"
  probe_redirect "legacy edition redirect" "https://www.inspr.at/v1/" "301,302,307,308" "https://v1.inspr.at/v1/" "1"
  probe_redirect "legacy ELI10 redirect" "https://www.inspr.at/eli10/" "301,302,307,308" "https://www.inspr.at/overview/" "1"
  probe_redirect "apex canonical redirect" "https://inspr.at/" "301,302,307,308" "https://www.inspr.at/" "1"
  probe_page "identity entry route" "https://inspr.at/enter" "inspr.at" "text/html"
  probe_redirect "identity login route" "https://inspr.at/login" "302" "https://auth.inspr.at/" "1"
  probe_redirect "identity service HTTPS" "https://auth.inspr.at/" "302" "/ui/login" "1"
  probe_redirect "apex HTTP upgrade" "http://inspr.at/" "301,302,307,308" "https://inspr.at/"
  probe_redirect "www HTTP upgrade" "http://www.inspr.at/" "301,302,307,308" "https://www.inspr.at/"
  probe_redirect "Aithema HTTP upgrade" "http://aithema.inspr.at/" "301,302,307,308" "https://aithema.inspr.at/"
  probe_redirect "Paimos HTTP upgrade" "http://paimos.inspr.at/" "301,302,307,308" "https://paimos.inspr.at/"
  probe_redirect "Pharos HTTP upgrade" "http://pharos.inspr.at/" "301,302,307,308" "https://pharos.inspr.at/"
  probe_redirect "Janus HTTP upgrade" "http://janus.inspr.at/" "301,302,307,308" "https://janus.inspr.at/"
  probe_redirect "v1 HTTP upgrade" "http://v1.inspr.at/" "301,302,307,308" "https://v1.inspr.at/"
  probe_redirect "identity HTTP upgrade" "http://auth.inspr.at/" "301,302,307,308" "https://auth.inspr.at/"
fi

# Only a fully probed release becomes the documented rollback target. All
# builds remain immutable, so operators can also select any older id manually.
if [ -n "$CURRENT_RELEASE" ] && [ "$CURRENT_RELEASE" != "$RELEASE_TARGET" ]; then
  atomic_release_link "$CURRENT_RELEASE" "previous" "$RELEASE_ID"
fi
record_release_event promoted "$RELEASE_ID" "$CALENDAR_VERSION" "$MANIFEST_RELEASE_SEQUENCE" "$RELEASE_SET_DIGEST" || \
  printf '\033[1;31mERROR\033[0m promotion event was not recorded in %s\n' "$REMOTE_EVENTS" >&2

PROMOTION_STARTED=0
release_deploy_lock
trap - EXIT INT TERM
ok "deployment complete: $RELEASE_ID, version $CALENDAR_VERSION, release set $RELEASE_SET_DIGEST"
