#!/usr/bin/env bash
# bootstrap-zitadel.sh — one-shot post-init bootstrap for the inspr.at IdP.
#
# WHEN TO RUN: exactly once, after `docker compose up -d zitadel-postgres
# zitadel` has reported zitadel as healthy at https://auth.inspr.at on first
# boot. Re-running is safe in the sense that it skips already-existing
# resources, but the OIDC client_secret is only revealed on creation — so
# don't lose the .env writeback the first time around.
#
# WHAT IT DOES:
#   1. Reads the bootstrap machine-user PAT from the zitadel_machinekey
#      docker volume (written by Zitadel at first init via
#      ZITADEL_FIRSTINSTANCE_PATPATH).
#   2. Discovers the org (= "INSPR") and project ID.
#   3. Creates the project "inspr.at" (idempotent on title collision).
#   4. Creates an OIDC web application with redirect URI
#      https://inspr.at/welcome and post-logout https://inspr.at/.
#   5. Creates the human user "markus" with the bootstrap password.
#   6. Grants the user a project role so the OIDC token includes them.
#   7. Prints the OIDC_CLIENT_ID + OIDC_CLIENT_SECRET (and appends them
#      to .env if --write-env is passed).
#
# REQUIRES on host: docker, jq, curl. (Standard csb1 toolchain.)

set -euo pipefail

ZITADEL_BASE="${ZITADEL_BASE:-https://auth.inspr.at}"
COMPOSE_DIR="${COMPOSE_DIR:-/home/mba/docker/inspr-at}"
ENV_FILE="${COMPOSE_DIR}/.env"
WRITE_ENV=0
USER_LOGIN_NAME="markus"
USER_FIRST="Markus"
USER_LAST="Barta"
USER_EMAIL="markus@barta.com"
USER_PASSWORD="${USER_PASSWORD:-changemesoon26!}"
PROJECT_NAME="inspr.at"
APP_NAME="inspr-www-auth"
REDIRECT_URI="https://inspr.at/welcome"
POST_LOGOUT_URI="https://inspr.at/"

PRINT_SECRET=0
RESET_PASSWORD=0
for arg in "$@"; do
  case "$arg" in
    --write-env) WRITE_ENV=1 ;;
    --print-secret) PRINT_SECRET=1 ;;
    --reset-password) RESET_PASSWORD=1 ;;
    -h|--help)
      sed -n '1,30p' "$0"; exit 0 ;;
  esac
done

log() { printf "[bootstrap] %s\n" "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

# ── 1. Read bootstrap PAT from volume ───────────────────────────────────
log "Reading bootstrap PAT from ./.machinekey/pat.txt…"
PAT="$(cat "${COMPOSE_DIR}/.machinekey/pat.txt" 2>/dev/null || true)"
if [ -z "$PAT" ]; then
  die "PAT not found at /machinekey/pat.txt — is zitadel still initializing? (check 'docker logs zitadel')"
fi
log "PAT acquired (len=${#PAT})"

AUTH=(-H "Authorization: Bearer $PAT" -H "Content-Type: application/json")

# ── 2. Wait for Zitadel readiness ───────────────────────────────────────
log "Waiting for ${ZITADEL_BASE}/.well-known/openid-configuration ..."
for i in $(seq 1 60); do
  if curl -fsS "${ZITADEL_BASE}/.well-known/openid-configuration" -o /dev/null; then
    log "Zitadel ready (after ${i}s)"
    break
  fi
  sleep 1
  [ "$i" = "60" ] && die "Zitadel not ready after 60s"
done

# ── 3. Discover the INSPR org ───────────────────────────────────────────
# Use /management/v1/orgs/me — the PAT is owned by a machine user inside
# the INSPR org, so "my own org" IS the INSPR org. The /admin/v1/orgs/_search
# endpoint also works (system-scope) but requires no x-zitadel-orgid header.
log "Looking up org via /management/v1/orgs/me…"
ORG_ME="$(curl -fsS "${AUTH[@]}" "${ZITADEL_BASE}/management/v1/orgs/me")"
ORG_ID="$(echo "$ORG_ME" | jq -r '.org.id')"
ORG_NAME="$(echo "$ORG_ME" | jq -r '.org.name')"
[ -n "$ORG_ID" ] && [ "$ORG_ID" != "null" ] || die "no org found"
log "Using org name='$ORG_NAME' id=$ORG_ID"
AUTH+=(-H "x-zitadel-orgid: $ORG_ID")

# ── 4. Find or create the project ───────────────────────────────────────
log "Looking for existing project '${PROJECT_NAME}'…"
PROJ_LIST="$(curl -fsS "${AUTH[@]}" "${ZITADEL_BASE}/management/v1/projects/_search" -d '{}')"
PROJECT_ID="$(echo "$PROJ_LIST" | jq -r --arg n "$PROJECT_NAME" '.result[]? | select(.name==$n) | .id' | head -1)"
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
  log "Creating project…"
  PROJECT_ID="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/projects" \
    -d "$(jq -n --arg n "$PROJECT_NAME" '{name:$n, projectRoleAssertion:false, projectRoleCheck:false, hasProjectCheck:false, privateLabelingSetting:"PRIVATE_LABELING_SETTING_UNSPECIFIED"}')" \
    | jq -r '.id')"
fi
[ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ] || die "project create failed"
log "Project id=$PROJECT_ID"

# ── 5. Find or create the OIDC application ──────────────────────────────
log "Looking for existing OIDC app '${APP_NAME}'…"
APP_LIST="$(curl -fsS "${AUTH[@]}" "${ZITADEL_BASE}/management/v1/projects/${PROJECT_ID}/apps/_search" -d '{}')"
APP_ID="$(echo "$APP_LIST" | jq -r --arg n "$APP_NAME" '.result[]? | select(.name==$n) | .id' | head -1)"
if [ -z "$APP_ID" ] || [ "$APP_ID" = "null" ]; then
  log "Creating OIDC web application…"
  APP_RESP="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/projects/${PROJECT_ID}/apps/oidc" \
    -d "$(jq -n --arg n "$APP_NAME" --arg ru "$REDIRECT_URI" --arg pl "$POST_LOGOUT_URI" '{
        name: $n,
        redirectUris: [$ru],
        responseTypes: ["OIDC_RESPONSE_TYPE_CODE"],
        grantTypes: ["OIDC_GRANT_TYPE_AUTHORIZATION_CODE", "OIDC_GRANT_TYPE_REFRESH_TOKEN"],
        appType: "OIDC_APP_TYPE_WEB",
        authMethodType: "OIDC_AUTH_METHOD_TYPE_BASIC",
        postLogoutRedirectUris: [$pl],
        version: "OIDC_VERSION_1_0",
        devMode: false,
        accessTokenType: "OIDC_TOKEN_TYPE_BEARER",
        accessTokenRoleAssertion: false,
        idTokenRoleAssertion: false,
        idTokenUserinfoAssertion: true,
        clockSkew: "0s",
        additionalOrigins: []
      }')")"
  APP_ID="$(echo "$APP_RESP" | jq -r '.appId')"
  CLIENT_ID="$(echo "$APP_RESP" | jq -r '.clientId')"
  CLIENT_SECRET="$(echo "$APP_RESP" | jq -r '.clientSecret')"
else
  log "App exists (id=$APP_ID); regenerating client secret…"
  APP_DETAIL="$(curl -fsS "${AUTH[@]}" "${ZITADEL_BASE}/management/v1/projects/${PROJECT_ID}/apps/${APP_ID}")"
  CLIENT_ID="$(echo "$APP_DETAIL" | jq -r '.app.oidcConfig.clientId')"
  SECRET_RESP="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/projects/${PROJECT_ID}/apps/${APP_ID}/oidc_config/_generate_client_secret")"
  CLIENT_SECRET="$(echo "$SECRET_RESP" | jq -r '.clientSecret')"
fi
[ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ] || die "no clientId returned"
[ -n "$CLIENT_SECRET" ] && [ "$CLIENT_SECRET" != "null" ] || die "no clientSecret returned"
log "Client id=$CLIENT_ID (secret captured, ${#CLIENT_SECRET} bytes)"

# ── 6. Relax the org password complexity policy to admit the bootstrap pwd
#       Default policy requires upper+lower+number+symbol; we drop the
#       upper requirement so the user-chosen "changemesoon26!" admits.
#       The user is expected to rotate via the console; this is a spike-
#       grade convenience, not a long-term setting.
log "Relaxing org password complexity (drop uppercase requirement)…"
# Idempotent across runs:
#   - First run: no custom policy → PUT 404 → POST creates it
#   - Subsequent runs: custom policy exists → PUT 200 (or 409 "no changes")
# We treat 200/201/409 all as success; only abort on truly unexpected codes.
RELAX_PAYLOAD='{"minLength":"8","hasLowercase":true,"hasUppercase":false,"hasNumber":true,"hasSymbol":true}'
HTTP_CODE="$(curl -sS -o /tmp/policy.out -w '%{http_code}' "${AUTH[@]}" -X PUT "${ZITADEL_BASE}/management/v1/policies/password/complexity" -d "$RELAX_PAYLOAD")"
case "$HTTP_CODE" in
  200|201)
    log "  policy updated (HTTP $HTTP_CODE)"
    ;;
  409)
    log "  policy already at desired state (HTTP 409 — no-op)"
    ;;
  404|400)
    log "  no custom policy yet → creating one"
    POST_CODE="$(curl -sS -o /tmp/policy.out -w '%{http_code}' "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/policies/password/complexity" -d "$RELAX_PAYLOAD")"
    case "$POST_CODE" in
      200|201|409) log "  created (HTTP $POST_CODE)" ;;
      *) log "  WARN: create returned HTTP $POST_CODE — body:"; cat /tmp/policy.out >&2 ;;
    esac
    ;;
  *)
    log "  WARN: policy PUT returned HTTP $HTTP_CODE — body:"
    cat /tmp/policy.out >&2
    ;;
esac

# ── 7. Create the human user ────────────────────────────────────────────
log "Looking for existing user '${USER_LOGIN_NAME}'…"
USER_SEARCH="$(curl -fsS "${AUTH[@]}" "${ZITADEL_BASE}/management/v1/users/_search" -d "$(jq -n --arg ln "$USER_LOGIN_NAME" '{queries:[{userNameQuery:{userName:$ln, method:"TEXT_QUERY_METHOD_EQUALS"}}]}')")"
USER_ID="$(echo "$USER_SEARCH" | jq -r '.result[0].id // empty')"
if [ -z "$USER_ID" ]; then
  log "Creating user…"
  USER_RESP="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/users/human/_import" \
    -d "$(jq -n --arg ln "$USER_LOGIN_NAME" --arg fn "$USER_FIRST" --arg lln "$USER_LAST" --arg em "$USER_EMAIL" --arg pw "$USER_PASSWORD" '{
        userName: $ln,
        profile: { firstName: $fn, lastName: $lln, displayName: ($fn + " " + $lln), preferredLanguage: "en" },
        email: { email: $em, isEmailVerified: true },
        password: $pw,
        passwordChangeRequired: false,
        requestPasswordlessRegistration: false
      }')")"
  USER_ID="$(echo "$USER_RESP" | jq -r '.userId')"
elif [ "$RESET_PASSWORD" = "1" ]; then
  log "User exists (id=$USER_ID); resetting password (--reset-password requested)…"
  PWRESP="$(curl -sS -o /tmp/pwreset.out -w '%{http_code}' "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/users/${USER_ID}/password" \
    -d "$(jq -n --arg pw "$USER_PASSWORD" '{newPassword:{password:$pw, changeRequired:false}}')")"
  if [ "$PWRESP" != "200" ]; then
    log "  WARN: password reset returned HTTP $PWRESP — body:"
    cat /tmp/pwreset.out >&2
    log "  (continuing — secret rotation has already succeeded; existing user password unchanged)"
  fi
else
  log "User exists (id=$USER_ID); leaving password unchanged (use --reset-password to force)"
fi
[ -n "$USER_ID" ] && [ "$USER_ID" != "null" ] || die "user create failed"
log "User id=$USER_ID"

# ── 8. Patch ZITADEL Console OIDC app — enable refresh tokens ───────────
# Self-hosted Zitadel ships the built-in Console OIDC app with ONLY the
# AUTHORIZATION_CODE grant. The browser-side console can therefore obtain
# an access token but never refresh it, so after the access-token TTL
# (default ~12h) the user gets stuck on a persistent "Token.Invalid"
# error toast with no auto-recovery path. Adding REFRESH_TOKEN to the
# grant set lets the console silently refresh and the toast disappears
# from the UX entirely.
#
# Idempotent: PUT-with-full-config replaces the OIDC config wholesale.
# Re-runs are no-ops (HTTP 200 with no functional change, or 409 from
# Zitadel's "no change" guard, both treated as success).
#
# References:
#   - https://github.com/zitadel/zitadel/issues/8392
#   - This trap was discovered the hard way on 2026-05-10; baking the
#     fix here prevents anyone re-bootstrapping a fresh Zitadel from
#     hitting it again.
log "Patching ZITADEL Console OIDC app — enabling refresh-token grant…"
ZP_SYSTEM="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/projects/_search" -d '{}' \
  | jq -r '.result[]? | select(.name=="ZITADEL") | .id' | head -1)"
if [ -z "$ZP_SYSTEM" ] || [ "$ZP_SYSTEM" = "null" ]; then
  log "  WARN: ZITADEL system project not found — skipping console fix"
else
  CONSOLE_APP_ID="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/projects/${ZP_SYSTEM}/apps/_search" -d '{}' \
    | jq -r '.result[]? | select(.name=="Console") | .id' | head -1)"
  if [ -z "$CONSOLE_APP_ID" ] || [ "$CONSOLE_APP_ID" = "null" ]; then
    log "  WARN: Console app not found in system project — skipping console fix"
  else
    CONSOLE_PAYLOAD="$(jq -n \
      --arg redir    "${ZITADEL_BASE}/ui/console/auth/callback" \
      --arg signedout "${ZITADEL_BASE}/ui/console/signedout" \
      --arg origin   "${ZITADEL_BASE}" '{
        redirectUris:             [$redir],
        responseTypes:            ["OIDC_RESPONSE_TYPE_CODE"],
        grantTypes:               ["OIDC_GRANT_TYPE_AUTHORIZATION_CODE", "OIDC_GRANT_TYPE_REFRESH_TOKEN"],
        appType:                  "OIDC_APP_TYPE_USER_AGENT",
        authMethodType:           "OIDC_AUTH_METHOD_TYPE_NONE",
        postLogoutRedirectUris:   [$signedout],
        version:                  "OIDC_VERSION_1_0",
        devMode:                  false,
        accessTokenType:          "OIDC_TOKEN_TYPE_BEARER",
        accessTokenRoleAssertion: false,
        idTokenRoleAssertion:     false,
        idTokenUserinfoAssertion: false,
        clockSkew:                "0s",
        allowedOrigins:           [$origin],
        skipNativeAppSuccessPage: false
      }')"
    PUT_CODE="$(curl -sS -o /tmp/console.out -w '%{http_code}' "${AUTH[@]}" -X PUT \
      "${ZITADEL_BASE}/management/v1/projects/${ZP_SYSTEM}/apps/${CONSOLE_APP_ID}/oidc_config" \
      -d "$CONSOLE_PAYLOAD")"
    case "$PUT_CODE" in
      200|201) log "  Console refresh-token grant ENABLED (HTTP $PUT_CODE)" ;;
      409)     log "  Console already at desired config (HTTP 409 — no-op)" ;;
      400)
        # Zitadel returns 400 + "No changes" when the PUT body matches
        # the existing config (idempotent re-run path). Real 400s have a
        # different message; surface those.
        if grep -q "No changes" /tmp/console.out 2>/dev/null; then
          log "  Console already at desired config (HTTP 400 — \"No changes\")"
        else
          log "  WARN: Console patch returned HTTP 400 — body:"
          cat /tmp/console.out >&2
        fi
        ;;
      *)       log "  WARN: Console patch returned HTTP $PUT_CODE — body:"
               cat /tmp/console.out >&2 ;;
    esac
  fi
fi

# ── 9. Display + optionally write to .env ───────────────────────────────
# DEFAULT: redact the secret (only length printed) so stdout-captured runs
# don't leak it into terminals/transcripts/CI logs. Pass --print-secret
# explicitly to opt in to cleartext output (e.g. when you need to copy it
# manually into a different env file).
echo
echo "──────────────────────────────────────────────"
echo "OIDC_CLIENT_ID=${CLIENT_ID}"
if [ "$PRINT_SECRET" = "1" ]; then
  echo "OIDC_CLIENT_SECRET=${CLIENT_SECRET}"
else
  echo "OIDC_CLIENT_SECRET=<redacted, length=${#CLIENT_SECRET}> (use --print-secret to show)"
fi
echo "──────────────────────────────────────────────"
echo

if [ "$WRITE_ENV" = "1" ]; then
  log "Writing OIDC_CLIENT_ID + OIDC_CLIENT_SECRET to ${ENV_FILE}…"
  # Idempotent in-place rewrite. Adds keys if missing.
  for kv in "OIDC_CLIENT_ID=${CLIENT_ID}" "OIDC_CLIENT_SECRET=${CLIENT_SECRET}"; do
    key="${kv%%=*}"
    if grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null; then
      sed -i "s|^${key}=.*|${kv}|" "$ENV_FILE"
    else
      echo "$kv" >> "$ENV_FILE"
    fi
  done
  log "Done. Now: cd ${COMPOSE_DIR} && docker compose up -d --no-deps inspr-auth"
fi

log "Bootstrap complete."
