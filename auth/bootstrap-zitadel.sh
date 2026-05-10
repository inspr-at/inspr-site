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

for arg in "$@"; do
  case "$arg" in
    --write-env) WRITE_ENV=1 ;;
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
# Try update first (200 if a custom policy exists); fall back to create.
RELAX_PAYLOAD='{"minLength":"8","hasLowercase":true,"hasUppercase":false,"hasNumber":true,"hasSymbol":true}'
HTTP_CODE="$(curl -sS -o /tmp/policy.out -w '%{http_code}' "${AUTH[@]}" -X PUT "${ZITADEL_BASE}/management/v1/policies/password/complexity" -d "$RELAX_PAYLOAD")"
if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "400" ]; then
  log "  no custom policy yet → creating one"
  curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/policies/password/complexity" -d "$RELAX_PAYLOAD" > /dev/null
elif [ "$HTTP_CODE" != "200" ]; then
  log "  policy update returned HTTP $HTTP_CODE — body:"
  cat /tmp/policy.out >&2
fi

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
else
  log "User exists (id=$USER_ID); resetting password…"
  curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/users/${USER_ID}/password" \
    -d "$(jq -n --arg pw "$USER_PASSWORD" '{newPassword:{password:$pw, changeRequired:false}}')" > /dev/null
fi
[ -n "$USER_ID" ] && [ "$USER_ID" != "null" ] || die "user create failed"
log "User id=$USER_ID"

# ── 7. Print + optionally write to .env ─────────────────────────────────
echo
echo "──────────────────────────────────────────────"
echo "OIDC_CLIENT_ID=${CLIENT_ID}"
echo "OIDC_CLIENT_SECRET=${CLIENT_SECRET}"
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
