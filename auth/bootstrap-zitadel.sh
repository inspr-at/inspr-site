#!/usr/bin/env bash
# bootstrap-zitadel.sh — one-shot post-init bootstrap for the inspr.at IdP.
#
# WHEN TO RUN: exactly once, after `docker compose up -d zitadel-postgres
# zitadel` has reported zitadel as healthy at https://auth.inspr.at on first
# boot. Re-running is safe in the sense that it skips already-existing
# resources, but the OIDC client_secret is only revealed on creation — so
# don't lose the .env writeback the first time around.
#
# WHAT IT DOES (in order — each step is idempotent):
#   1. Reads the bootstrap machine-user PAT (IAM_OWNER) from
#      ./.machinekey/pat.txt — written by Zitadel at first init via
#      ZITADEL_FIRSTINSTANCE_PATPATH. This PAT is used ONLY by this script.
#   2. Discovers the INSPR org via /management/v1/orgs/me.
#   3. Finds or creates the project "inspr.at".
#   4. Finds or creates the OIDC web application; rotates client_secret
#      only when --rotate-secret (or --write-env) is passed.
#   5. Relaxes org password complexity (drops uppercase requirement) so
#      the bootstrap human-user password admits.
#   6. Finds or creates the human user "markus"; resets password only
#      when --reset-password is passed, and grants ORG_OWNER so the
#      user can administer the INSPR org in the Console.
#   7. (skipped — folded into 6)
#   8. Patches the built-in ZITADEL Console OIDC app to enable the
#      REFRESH_TOKEN grant (works around upstream issue #8392).
#   9. SMTP relay config (INSPR-163) — finds-or-creates an SMTP config
#      pointed at the docker network alias `smtp:25` (csb1-smtp-1) and
#      activates it. Idempotent via description-based lookup.
#  10. Scoped service-account (INSPR-162) — finds-or-creates the
#      `inspr-auth-sa` machine user with ORG_USER_MANAGER (only the
#      scope inspr-auth needs: create users + send passwordless link),
#      grants it the role, and mints a long-lived PAT. The PAT is
#      retrievable only at creation, so re-runs preserve the existing
#      one unless --rotate-sa-pat (or --write-env, which auto-implies)
#      is passed.
#  11. Prints OIDC_CLIENT_ID/SECRET + INSPR_AUTH_SA_PAT (redacted by
#      default; use --print-secret for cleartext) and writes them to
#      .env when --write-env is passed.
#
# FLAGS:
#   --write-env       Persist all minted values to .env (auto-implies
#                     --rotate-secret + --rotate-sa-pat for newly-minted
#                     values). After this, restart inspr-auth.
#   --rotate-secret   Mint a NEW OIDC client_secret. Requires inspr-auth
#                     restart immediately after.
#   --rotate-sa-pat   Mint a NEW INSPR_AUTH_SA_PAT (revokes the old one
#                     by replacement). Requires inspr-auth restart.
#   --reset-password  Reset the bootstrap human-user password.
#   --print-secret    Print secrets in cleartext (default: <redacted>).
#   --remove-legacy-pat
#                     Remove the legacy ZITADEL_API_PAT line from .env
#                     after the migration to INSPR_AUTH_SA_PAT is
#                     complete. Idempotent — does nothing if the key is
#                     already absent. Run AFTER inspr-auth has been
#                     restarted with the new scoped PAT (otherwise the
#                     fallback in main.go would have nothing to fall
#                     back to during a brief window).
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
USER_ORG_ROLE="${USER_ORG_ROLE:-ORG_OWNER}"
PROJECT_NAME="inspr.at"
APP_NAME="inspr-www-auth"
REDIRECT_URI="https://inspr.at/welcome"
POST_LOGOUT_URI="https://inspr.at/"

PRINT_SECRET=0
RESET_PASSWORD=0
ROTATE_SECRET=0
ROTATE_SA_PAT=0
REMOVE_LEGACY_PAT=0
for arg in "$@"; do
  case "$arg" in
    --write-env) WRITE_ENV=1 ;;
    --print-secret) PRINT_SECRET=1 ;;
    --reset-password) RESET_PASSWORD=1 ;;
    --rotate-secret) ROTATE_SECRET=1 ;;
    --rotate-sa-pat) ROTATE_SA_PAT=1 ;;
    --remove-legacy-pat) REMOVE_LEGACY_PAT=1 ;;
    -h|--help)
      sed -n '1,60p' "$0"; exit 0 ;;
  esac
done

# Per-key writeback gates. Default off — we never silently overwrite a
# secret in .env unless the user opted in (--write-env) OR the key is
# missing entirely (first-install convenience).
WRITE_OIDC=0
WRITE_SA_PAT=0

# --write-env on an existing resource would write the OLD value back —
# Zitadel returns the OIDC client_secret and PAT tokens ONLY at the
# create/regenerate moment. If the user passed --write-env, they're
# saying "I want fresh values in .env" → that IMPLIES rotation AND
# writeback of every such resource. Auto-enable to honor intent.
if [ "$WRITE_ENV" = "1" ]; then
  [ "$ROTATE_SECRET" = "0" ] && ROTATE_SECRET=1
  [ "$ROTATE_SA_PAT" = "0" ] && ROTATE_SA_PAT=1
  WRITE_OIDC=1
  WRITE_SA_PAT=1
fi

# First-install convenience for the SA PAT only: if INSPR_AUTH_SA_PAT
# isn't in .env yet, we have no token to preserve — auto-mint + auto-
# write JUST that key (PATs are returned only at creation, so without
# this it'd vanish into the void). Critically, this does NOT touch
# OIDC rotation — that keeps a known-good live system intact.
if [ ! -f "$ENV_FILE" ] || ! grep -qE '^INSPR_AUTH_SA_PAT=' "$ENV_FILE" 2>/dev/null; then
  ROTATE_SA_PAT=1
  WRITE_SA_PAT=1
fi

log() { printf "[bootstrap] %s\n" "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

assert_org_role() {
  local user_id="$1"
  local role="$2"
  local label="$3"
  local code

  log "Asserting role ${role} on org for ${label}…"
  code="$(curl -sS -o /tmp/org-role.out -w '%{http_code}' "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/orgs/me/members" \
    -d "$(jq -n --arg uid "$user_id" --arg r "$role" '{userId:$uid, roles:[$r]}')")"
  case "$code" in
    200|201) log "  Role granted (HTTP $code)" ;;
    409)     log "  Role already granted (HTTP 409 — no-op)" ;;
    *)       log "  WARN: role grant returned HTTP $code — body:"; cat /tmp/org-role.out >&2 ;;
  esac
}

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
  # IMPORTANT: Zitadel only returns the client secret at create time or
  # explicit _generate_client_secret. There's no "read existing secret"
  # path. So:
  #   - Default re-run (no flags): leave secret untouched, just confirm
  #     client_id. The previously-rendered .env stays valid; restart of
  #     consumers not required.
  #   - --rotate-secret (or --write-env, which auto-implies it): mint a
  #     NEW secret. ALL consumers (inspr-auth) MUST be restarted with
  #     the new .env value or OIDC token exchange will return
  #     "invalid_client". This is the trap that bit us 2026-05-10 —
  #     diagnostic re-runs without --write-env silently rotated the
  #     secret and broke the live login flow.
  APP_DETAIL="$(curl -fsS "${AUTH[@]}" "${ZITADEL_BASE}/management/v1/projects/${PROJECT_ID}/apps/${APP_ID}")"
  CLIENT_ID="$(echo "$APP_DETAIL" | jq -r '.app.oidcConfig.clientId')"
  if [ "$ROTATE_SECRET" = "1" ]; then
    log "App exists (id=$APP_ID); --rotate-secret → generating new client secret…"
    SECRET_RESP="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/projects/${PROJECT_ID}/apps/${APP_ID}/oidc_config/_generate_client_secret")"
    CLIENT_SECRET="$(echo "$SECRET_RESP" | jq -r '.clientSecret')"
  else
    log "App exists (id=$APP_ID); leaving client secret unchanged (use --rotate-secret to force)"
    CLIENT_SECRET=""  # signal: nothing to write/print
  fi
fi
[ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ] || die "no clientId returned"
# CLIENT_SECRET may legitimately be empty when the secret was preserved
# (re-run without --rotate-secret). Only validate when a value was
# actually expected.
if [ "$ROTATE_SECRET" = "1" ] || [ -z "$APP_ID" ] || [ "$APP_ID" = "null" ]; then
  [ -n "$CLIENT_SECRET" ] && [ "$CLIENT_SECRET" != "null" ] || die "no clientSecret returned"
fi
if [ -n "$CLIENT_SECRET" ]; then
  log "Client id=$CLIENT_ID (NEW secret captured, ${#CLIENT_SECRET} bytes)"
else
  log "Client id=$CLIENT_ID (secret unchanged)"
fi

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
assert_org_role "$USER_ID" "$USER_ORG_ROLE" "$USER_LOGIN_NAME"

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

    # ── 8b. VERIFY the Console refresh-token grant actually landed. ──
    # The PUT could succeed (200/201/400-No-changes) but Zitadel might
    # silently keep its prior config (some upstream versions had this
    # bug pattern). Re-GET the oidc_config and assert REFRESH_TOKEN is
    # in the active grant set. Without this verification step, a future
    # Console regression could re-introduce the Token.Invalid trap with
    # nobody noticing until a user complaint surfaces ~12h later.
    CONSOLE_VERIFY="$(curl -fsS "${AUTH[@]}" "${ZITADEL_BASE}/management/v1/projects/${ZP_SYSTEM}/apps/${CONSOLE_APP_ID}" 2>/dev/null \
      | jq -r '.app.oidcConfig.grantTypes // [] | join(",")')"
    if echo "$CONSOLE_VERIFY" | grep -q "OIDC_GRANT_TYPE_REFRESH_TOKEN"; then
      log "  Verify: REFRESH_TOKEN present in active grants (\"$CONSOLE_VERIFY\")"
    else
      log "  WARN: Verify FAILED — REFRESH_TOKEN missing from active grants (\"$CONSOLE_VERIFY\")"
      log "        Console UX will hit Token.Invalid (QUERY-IJL3H) ~12h after each login."
      log "        Investigate manually via the Zitadel admin UI."
    fi
  fi
fi

# ── 9. SMTP relay configuration (INSPR-163) ─────────────────────────────
# Zitadel needs SMTP wired BEFORE the magic-link signup flow can deliver
# its passwordless-registration emails. We point at the host-local namshi
# relay (csb1-smtp-1, alias `smtp:25` on csb1_traefik) which smarthosts
# to mail.hover.com — inspr-auth never touches SMTP credentials.
#
# v2.54 quirks captured (probed 2026-05-11):
#   - SMTP API is multi-config: each POST creates a NEW config (no
#     idempotent body-match). PUT on /admin/v1/smtp returns 405. We
#     dedupe via description-string match in /_search.
#   - Each config has a `state` ENUM; only "SMTP_CONFIG_ACTIVE" (numeric
#     2) is used for outbound mail. New configs are inactive by default
#     → must POST /admin/v1/smtp/{id}/_activate.
#   - Empty-string `password` triggers a Zitadel nil-deref at decrypt
#     time. A single-char placeholder ("x") satisfies the cipher path.
#     Empty `user` is fine — Zitadel skips AUTH cleanly.
#   - Empty `user` against the namshi relay matters because the relay
#     advertises no AUTH; Zitadel only sends AUTH if user is non-empty.
SMTP_HOST="${SMTP_HOST:-smtp:25}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-x}"
SMTP_FROM_ADDRESS="${SMTP_FROM_ADDRESS:-markus@barta.com}"
SMTP_FROM_NAME="${SMTP_FROM_NAME:-INSPR}"
SMTP_REPLY_TO="${SMTP_REPLY_TO:-markus@barta.com}"
SMTP_DESCRIPTION="INSPR local relay (no auth — trusted docker net)"

log "Configuring Zitadel SMTP relay…"
SMTP_LIST="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/admin/v1/smtp/_search" -d '{}')"
EXISTING_SMTP_ID="$(echo "$SMTP_LIST" | jq -r --arg d "$SMTP_DESCRIPTION" '.result[]? | select(.description==$d) | .id' | head -1)"
EXISTING_SMTP_STATE="$(echo "$SMTP_LIST" | jq -r --arg d "$SMTP_DESCRIPTION" '.result[]? | select(.description==$d) | .state' | head -1)"

activate_smtp() {
  # POST /admin/v1/smtp/{id}/_activate. Returns 200 fresh, 409 if already
  # active. Both are success.
  local id="$1"
  local code
  code="$(curl -sS -o /tmp/smtp-act.out -w '%{http_code}' "${AUTH[@]}" -X POST "${ZITADEL_BASE}/admin/v1/smtp/${id}/_activate" -d '{}')"
  case "$code" in
    200|201) log "  Activated SMTP id=$id (HTTP $code)" ;;
    409)     log "  SMTP id=$id already active (HTTP 409 — no-op)" ;;
    *)       log "  WARN: activation returned HTTP $code — body:"; cat /tmp/smtp-act.out >&2 ;;
  esac
}

if [ -z "$EXISTING_SMTP_ID" ] || [ "$EXISTING_SMTP_ID" = "null" ]; then
  log "  No matching SMTP config → creating + activating…"
  SMTP_PAYLOAD="$(jq -n \
    --arg sender "$SMTP_FROM_ADDRESS" --arg name "$SMTP_FROM_NAME" \
    --arg host   "$SMTP_HOST"         --arg user "$SMTP_USER" --arg pwd "$SMTP_PASSWORD" \
    --arg reply  "$SMTP_REPLY_TO"     --arg desc "$SMTP_DESCRIPTION" '{
      senderAddress:  $sender,
      senderName:     $name,
      tls:            false,
      host:           $host,
      user:           $user,
      password:       $pwd,
      replyToAddress: $reply,
      description:    $desc
    }')"
  SMTP_CREATE="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/admin/v1/smtp" -d "$SMTP_PAYLOAD")"
  SMTP_ID="$(echo "$SMTP_CREATE" | jq -r '.id')"
  if [ -z "$SMTP_ID" ] || [ "$SMTP_ID" = "null" ]; then
    log "  WARN: SMTP create returned no id — body: $SMTP_CREATE"
  else
    log "  Created SMTP config id=$SMTP_ID"
    activate_smtp "$SMTP_ID"
  fi
elif [ "$EXISTING_SMTP_STATE" = "SMTP_CONFIG_ACTIVE" ] || [ "$EXISTING_SMTP_STATE" = "2" ]; then
  log "  SMTP config exists + active (id=$EXISTING_SMTP_ID) — no change"
else
  log "  SMTP config exists but state=$EXISTING_SMTP_STATE → activating…"
  activate_smtp "$EXISTING_SMTP_ID"
fi

# ── 10. Scoped service account for inspr-auth (INSPR-162) ───────────────
# Replace the IAM_OWNER bootstrap PAT in inspr-auth's env with a scoped
# machine user that only has the org-level permissions /enter actually
# needs: create users + send the passwordless-registration link email.
# ORG_USER_MANAGER is the canonical least-privilege role
# (org.user.read + org.user.write).
#
# Threat model: before this change, an inspr-auth env leak compromised
# the entire Zitadel instance (org create, user delete instance-wide,
# masterkey-protected secrets read). After: the blast radius is bounded
# to org-scope user manipulation within a single org.
#
# Idempotent:
#   - SA user created if missing, else preserved (uname-based search).
#   - Role grant always re-asserted (409 = already member = success).
#   - PAT minted only when ROTATE_SA_PAT=1 — set automatically on first
#     install (key missing from .env) or via --rotate-sa-pat flag.
SA_USERNAME="inspr-auth-sa"
SA_DISPLAY="Inspr Auth Service Account"
SA_ROLE="ORG_USER_MANAGER"

log "Looking for scoped service account '${SA_USERNAME}'…"
SA_SEARCH="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/users/_search" \
  -d "$(jq -n --arg ln "$SA_USERNAME" '{queries:[{userNameQuery:{userName:$ln, method:"TEXT_QUERY_METHOD_EQUALS"}}]}')")"
SA_USER_ID="$(echo "$SA_SEARCH" | jq -r '.result[0].id // empty')"
if [ -z "$SA_USER_ID" ]; then
  log "  Creating machine user…"
  SA_CREATE="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/users/machine" \
    -d "$(jq -n --arg ln "$SA_USERNAME" --arg n "$SA_DISPLAY" '{
      userName:        $ln,
      name:            $n,
      description:     "Scoped to ORG_USER_MANAGER for inspr-auth /enter signup flow.",
      accessTokenType: "ACCESS_TOKEN_TYPE_BEARER"
    }')")"
  SA_USER_ID="$(echo "$SA_CREATE" | jq -r '.userId')"
  if [ -z "$SA_USER_ID" ] || [ "$SA_USER_ID" = "null" ]; then
    die "SA create failed: $SA_CREATE"
  fi
fi
log "  SA user id=$SA_USER_ID"

log "  Asserting role ${SA_ROLE} on org…"
ROLE_CODE="$(curl -sS -o /tmp/sarole.out -w '%{http_code}' "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/orgs/me/members" \
  -d "$(jq -n --arg uid "$SA_USER_ID" --arg r "$SA_ROLE" '{userId:$uid, roles:[$r]}')")"
case "$ROLE_CODE" in
  200|201) log "  Role granted (HTTP $ROLE_CODE)" ;;
  409)     log "  Role already granted (HTTP 409 — no-op)" ;;
  *)       log "  WARN: role grant returned HTTP $ROLE_CODE — body:"; cat /tmp/sarole.out >&2 ;;
esac

NEW_SA_PAT=""
if [ "$ROTATE_SA_PAT" = "1" ]; then
  log "  Minting new PAT (rotate=1)…"
  # Long-dated expiration so we don't surprise-rotate via expiry alone.
  # Real rotation must come from --rotate-sa-pat with --write-env.
  PAT_RESP="$(curl -fsS "${AUTH[@]}" -X POST "${ZITADEL_BASE}/management/v1/users/${SA_USER_ID}/pats" \
    -d '{"expirationDate": "2099-12-31T23:59:59Z"}')"
  NEW_SA_PAT="$(echo "$PAT_RESP" | jq -r '.token')"
  if [ -z "$NEW_SA_PAT" ] || [ "$NEW_SA_PAT" = "null" ]; then
    die "PAT mint failed — body: $PAT_RESP"
  fi
  log "  Minted PAT (len=${#NEW_SA_PAT})"
else
  log "  Leaving SA PAT unchanged (use --rotate-sa-pat to mint a new one)"
fi

# ── 11. Display + optionally write to .env ──────────────────────────────
# DEFAULT: redact every secret (only length printed) so stdout-captured
# runs don't leak into terminals/transcripts/CI logs. Pass --print-secret
# to opt into cleartext (e.g. when copying to a different env file).
#
# Per-key writeback gates: WRITE_OIDC + WRITE_SA_PAT, set up at flag-
# parse time. --write-env sets both; first-install (missing SA PAT in
# .env) sets only WRITE_SA_PAT — so a one-time bootstrap doesn't
# silently rotate a working OIDC client_secret on the side.
echo
echo "──────────────────────────────────────────────"
echo "OIDC_CLIENT_ID=${CLIENT_ID}"
if [ -z "$CLIENT_SECRET" ]; then
  echo "OIDC_CLIENT_SECRET=<unchanged — pass --rotate-secret to mint a new one>"
elif [ "$PRINT_SECRET" = "1" ]; then
  echo "OIDC_CLIENT_SECRET=${CLIENT_SECRET}"
else
  echo "OIDC_CLIENT_SECRET=<redacted, length=${#CLIENT_SECRET}> (use --print-secret to show)"
fi
if [ -z "$NEW_SA_PAT" ]; then
  echo "INSPR_AUTH_SA_PAT=<unchanged — pass --rotate-sa-pat to mint a new one>"
elif [ "$PRINT_SECRET" = "1" ]; then
  echo "INSPR_AUTH_SA_PAT=${NEW_SA_PAT}"
else
  echo "INSPR_AUTH_SA_PAT=<redacted, length=${#NEW_SA_PAT}> (use --print-secret to show)"
fi
echo "──────────────────────────────────────────────"
echo

write_env_kv() {
  # Idempotent .env in-place rewrite. Adds the key if missing.
  local kv="$1"
  local key="${kv%%=*}"
  if grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${kv}|" "$ENV_FILE"
  else
    echo "$kv" >> "$ENV_FILE"
  fi
}

WROTE_ANYTHING=0
if [ "$WRITE_OIDC" = "1" ] && [ -n "$CLIENT_SECRET" ]; then
  log "Writing OIDC_CLIENT_ID + OIDC_CLIENT_SECRET to ${ENV_FILE}…"
  write_env_kv "OIDC_CLIENT_ID=${CLIENT_ID}"
  write_env_kv "OIDC_CLIENT_SECRET=${CLIENT_SECRET}"
  WROTE_ANYTHING=1
elif [ "$WRITE_OIDC" = "1" ] && [ -z "$CLIENT_SECRET" ]; then
  # Should be unreachable due to auto-implication of --rotate-secret
  # when --write-env is set, but defensive log just in case.
  log "WARN: --write-env passed but no new OIDC secret minted — OIDC keys unchanged in .env."
fi

if [ "$WRITE_SA_PAT" = "1" ] && [ -n "$NEW_SA_PAT" ]; then
  log "Writing INSPR_AUTH_SA_PAT to ${ENV_FILE}…"
  write_env_kv "INSPR_AUTH_SA_PAT=${NEW_SA_PAT}"
  WROTE_ANYTHING=1
elif [ "$WRITE_SA_PAT" = "1" ] && [ -z "$NEW_SA_PAT" ]; then
  log "WARN: --write-env passed but no new SA PAT minted — INSPR_AUTH_SA_PAT unchanged in .env."
fi

if [ "$WROTE_ANYTHING" = "1" ]; then
  log "Done. Now: cd ${COMPOSE_DIR} && docker compose up -d --no-deps --force-recreate inspr-auth"
fi

# ── 12. Optional legacy-PAT cleanup ─────────────────────────────────────
# Post-migration to INSPR_AUTH_SA_PAT, the legacy ZITADEL_API_PAT line in
# .env is dead weight — kept as a fallback in main.go for the migration
# window but never read once INSPR_AUTH_SA_PAT is set. Holding it adds
# blast-radius if .env leaks (it's the IAM_OWNER bootstrap PAT). Opt-in
# cleanup removes that residual exposure.
#
# Safe to run only AFTER inspr-auth has been restarted with
# INSPR_AUTH_SA_PAT active (startup log confirms scope: see main.go).
# Idempotent: no-op if the key is already absent.
if [ "$REMOVE_LEGACY_PAT" = "1" ]; then
  if [ ! -f "$ENV_FILE" ]; then
    log "Legacy-PAT cleanup: .env not found — nothing to do"
  elif grep -qE "^ZITADEL_API_PAT=" "$ENV_FILE" 2>/dev/null; then
    log "Removing legacy ZITADEL_API_PAT line from ${ENV_FILE}…"
    sed -i "/^ZITADEL_API_PAT=/d" "$ENV_FILE"
    log "  Removed. Restart inspr-auth so the env reload picks up the absence:"
    log "    cd ${COMPOSE_DIR} && docker compose up -d --no-deps --force-recreate inspr-auth"
  else
    log "Legacy-PAT cleanup: ZITADEL_API_PAT already absent from .env — no-op"
  fi
fi

log "Bootstrap complete."
