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
