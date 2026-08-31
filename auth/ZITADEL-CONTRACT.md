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
- `proto/zitadel/management.proto`: `ListUsers` is
  `POST /management/v1/users/_search` and requires `user.read`.
  `internal/api/grpc/management/user.go` appends the authenticated service
  account's organization to the exact-email query before returning provider
  IDs. The pinned `ORG_USER_MANAGER` role includes `user.read`. Protojson may
  represent zero results as an omitted `result` field or an explicit empty
  array, and may omit the false `isEmailVerified` scalar. The client accepts
  both canonical default-value shapes while rejecting wrong types, ambiguous
  results, mismatched email addresses, and response bodies without `details`.
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

The tests pin both protojson default-value shapes, the JSON field names and
endpoint order, prove email remains unverified at creation, reject a forged
ownership-link state before provider access, and exercise both
lost-create-response resend and verified-email/passkey-send retry recovery.
Provider response bodies are never logged or returned.

Successful ownership-link delivery is recorded in a bounded in-memory tracker
through the signed link's expiry, so replay does not emit another passwordless
mail. Concurrent followers join the in-flight operation and cannot render
success until its provider result is known; a failed result reaches every
follower and releases the reservation for a real retry. Distinct links are
independently limited per user and authoritative client key.

Signup first performs the organization/permission-filtered v2 exact-email
lookup, then either creates or sends recovery. Both normal outcomes have the
same two-call shape and public status/body. Recovery uses the provider-returned
ID, so historical random IDs and IDs derived before a `COOKIE_KEY` rotation do
not strand the account. An exact lookup is also repeated after a create
conflict to close concurrent-create races. Verified recovery uses the bounded
signup IP/email buckets and per-user delivery cooldown without exposing a
distinct account state.

## Required edge dependency

NIX-400 owns the authoritative csb1 Cloudflare-only router gate and age-backed
proxy-attestation secret. It must land before this signup flow is rolled out.
This repository's compose file is reference evidence only; when the token is
absent or mismatched, the application deliberately ignores forwarded identity
and uses the direct Traefik peer as one shared fail-closed rate bucket. The
pinned cloudflarewarp source contract and official Cloudflare CIDR update check
live in `cloudflare-edge-contract.json` and `check-edge-contract.mjs`.
