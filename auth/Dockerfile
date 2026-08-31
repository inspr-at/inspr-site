# inspr-auth — multi-stage build, distroless static runtime.
# Builds to ~12MB image, no shell, no package manager, no glibc.

FROM golang:1.26-alpine AS build
WORKDIR /src

# Cache mod downloads as a separate layer.
COPY go.mod go.sum* ./
RUN go mod download

COPY main.go main_test.go ./
COPY templates ./templates

# Run the OIDC state/nonce and session regressions in the same pinned Go image
# that compiles the production binary. Values are inert test configuration;
# no live issuer or credential is used during the unit tests.
RUN OIDC_ISSUER=https://issuer.invalid \
    OIDC_CLIENT_ID=test-client \
    OIDC_CLIENT_SECRET=test-secret \
    BASE_URL=https://inspr.at \
    COOKIE_KEY=0000000000000000000000000000000000000000000000000000000000000000 \
    go test ./...

# CGO off → fully static binary; trimpath + ldflags strip debug + symbol
# tables for a small, reproducible build.
ENV CGO_ENABLED=0 GOOS=linux
RUN go build -trimpath -ldflags="-s -w" -o /out/inspr-auth ./...

FROM gcr.io/distroless/static-debian12:nonroot
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"
WORKDIR /app
COPY --from=build /out/inspr-auth /app/inspr-auth
COPY --from=build /src/templates /app/templates
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app/inspr-auth"]
