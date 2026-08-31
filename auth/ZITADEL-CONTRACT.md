# ZITADEL signup contract

`/enter` targets the ZITADEL image pinned on `csb1`:

- image digest: `sha256:5fb493fdb73204667cdd05715ef5f140049bf2781e10fd8ca407ce5aaa29f3df`
- source revision: `8565d24fd8df5bd35294313cfbfcc2e15aea20e9`
- source tag: `v2.54.8`

The ownership flow follows these contracts from that revision:

- `proto/zitadel/user/v2beta/user_service.proto`: `AddHumanUser` is
  `POST /v2beta/users/human`; an unverified `SetHumanEmail.send_code` accepts a
  custom URL template. `VerifyEmail` is
  `POST /v2beta/users/{user_id}/email/verify`, and `GetUserByID` is
  `GET /v2beta/users/{user_id}`.
- `internal/api/grpc/user/v2/user.go` validates the custom URL template before
  the create command. `internal/command/user_human.go` appends
  `HumanEmailCodeAddedEventV2` when v2 creates an unverified email; it does not
  append the legacy initial-code event.
- `proto/zitadel/management.proto`: `SendPasswordlessRegistration` is
  `POST /management/v1/users/{user_id}/passwordless/_send_link` and requires
  `user.write`, which the deployed `ORG_USER_MANAGER` service account has.
- `internal/domain/human.go` makes the legacy v1 imported user Initial while
  its email is unverified. `internal/command/user_human_webauthn.go` completes
  passwordless registration without emitting email-verification or initialized
  events. That is why `/enter` must not use `ImportHumanUser` for this flow.

The tests pin the JSON field names and endpoint order, prove email remains
unverified at creation, reject a forged ownership-link state before provider
access, and exercise both lost-create-response resend and
verified-email/passkey-send retry recovery. Provider response bodies are never
logged or returned.

Successful ownership-link delivery is recorded in a bounded in-memory tracker
through the signed link's expiry, so replay does not emit another passwordless
mail. Distinct links are independently limited per user and authoritative
client key. A verified deterministic-account conflict uses the already bounded
signup IP/email buckets and a per-user delivery cooldown to request recovery
without returning a distinguishable account state.

## Required edge dependency

NIX-400 owns the authoritative csb1 Cloudflare-only router gate and age-backed
proxy-attestation secret. It must land before this signup flow is rolled out.
This repository's compose file is reference evidence only; when the token is
absent or mismatched, the application deliberately ignores forwarded identity
and uses the direct Traefik peer as one shared fail-closed rate bucket. The
pinned cloudflarewarp source contract and official Cloudflare CIDR update check
live in `cloudflare-edge-contract.json` and `check-edge-contract.mjs`.
