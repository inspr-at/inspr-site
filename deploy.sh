#!/usr/bin/env bash
# deploy.sh — one-shot deploy of inspr.at to csb1.
#
# What this does (in order):
#   1. npm run build                   in web/
#   2. python3 web/scripts/verify-csp.py    — abort if a new inline script
#                                       has no hash pin in Caddyfile
#   3. rsync web/dist/  → site/        (local mirror of the build)
#   4. rsync site/      → csb1:$REMOTE_DIR/site/        (--delete; this is
#                                       what Caddy serves; bind-mounted RO
#                                       into inspr-www so changes are live
#                                       on the next request, no reload)
#   5. If Caddyfile differs from remote:
#        scp Caddyfile   → csb1:$REMOTE_DIR/Caddyfile
#        docker exec inspr-www caddy reload --address unix//config/caddy-admin.sock
#                                       — zero-downtime reload via the unix
#                                       socket admin API. If caddy can't be
#                                       reached on the socket (e.g. first
#                                       deploy after switching from
#                                       `admin off`), falls back to
#                                       `docker compose restart inspr-www`.
#      Otherwise: skip (no caddy interaction needed).
#   6. Probe https://inspr.at/, /v1/, /v2/  — exit non-zero on any failure.
#
# Env vars:
#   INSPR_AT_HOST     SSH alias or host (default: csb1)
#   INSPR_AT_DIR      remote dir       (default: /home/mba/docker/inspr-at)
#   SKIP_BUILD=1      reuse the existing web/dist/ (e.g. after a manual edit)
#   SKIP_PROBE=1      skip the post-deploy https probe (e.g. running offline)
#
# Idempotent. Safe to re-run.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOST="${INSPR_AT_HOST:-csb1}"
REMOTE_DIR="${INSPR_AT_DIR:-/home/mba/docker/inspr-at}"

say() { printf '\033[1;36m→\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ── 1. build ──────────────────────────────────────────────────────────────
if [ "${SKIP_BUILD:-}" = "1" ]; then
  say "build skipped (SKIP_BUILD=1) — reusing web/dist/"
else
  say "building Astro site"
  (cd "$ROOT/web" && npm run build)
fi

# ── 2. verify CSP ─────────────────────────────────────────────────────────
say "verifying CSP hashes"
python3 "$ROOT/web/scripts/verify-csp.py"

# ── 3. mirror dist → site (local) ─────────────────────────────────────────
say "mirroring web/dist/ → site/"
rsync -a --delete "$ROOT/web/dist/" "$ROOT/site/"

# ── 4. rsync site/ to csb1 ────────────────────────────────────────────────
say "rsync site/ → $HOST:$REMOTE_DIR/site/"
rsync -avz --delete "$ROOT/site/" "$HOST:$REMOTE_DIR/site/"

# ── 5. Caddyfile diff → scp + reload (only if changed) ────────────────────
LOCAL_HASH=$(shasum -a 256 "$ROOT/Caddyfile" | awk '{print $1}')
REMOTE_HASH=$(ssh "$HOST" "sha256sum $REMOTE_DIR/Caddyfile 2>/dev/null | awk '{print \$1}'" || echo "")
if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
  say "Caddyfile changed → scp + reload"
  scp -q "$ROOT/Caddyfile" "$HOST:$REMOTE_DIR/Caddyfile"
  if ssh "$HOST" "docker exec inspr-www caddy reload --address unix//config/caddy-admin.sock --config /etc/caddy/Caddyfile" 2>/dev/null; then
    ok "reloaded (zero-downtime)"
  else
    say "reload failed (admin socket unreachable) — falling back to container restart"
    ssh "$HOST" "cd $REMOTE_DIR && docker compose restart inspr-www"
    ok "restarted"
  fi
else
  ok "Caddyfile unchanged — no reload needed"
fi

# ── 6. live probe ─────────────────────────────────────────────────────────
if [ "${SKIP_PROBE:-}" = "1" ]; then
  ok "probe skipped (SKIP_PROBE=1)"
else
  say "probing live site"
  bust="?bust=$(date +%s)"
  for path in / /v1/ /v2/; do
    code=$(curl -s -o /dev/null -w '%{http_code}' "https://inspr.at${path}${bust}")
    if [ "$code" = "200" ]; then
      ok "${path} → 200"
    else
      die "${path} → $code"
    fi
  done
fi

ok "deployed"
