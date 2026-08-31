#!/usr/bin/env python3
"""Parsed, fail-closed contract tests for auth image publication."""

from __future__ import annotations

import hashlib
import json
import pathlib
import subprocess
import sys
from collections.abc import Callable
from typing import Any

WORKFLOW = pathlib.Path(__file__).parents[1] / "workflows" / "auth-image.yml"
EXPECTED_STEPS_SHA256 = (
    "da75ef2dba5c5a490b8ea9acd453916d5384a7a2b3d830f10055b2ff02c6b083"
)
NON_PR = "github.event_name != 'pull_request'"
RELEASE_DIGEST_ENV = {"DIGEST": "${{ steps.release.outputs.digest }}"}

EXPECTED_ORDER = [
    "uses:actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09",
    "name:test fail-closed publication contract",
    "uses:docker/setup-buildx-action@8d2750c68a42422c14e847fe6c8ac0403b4cbd6f",
    "uses:docker/login-action@c94ce9fb468520275223c153574b00df6fe4bcc9",
    "uses:docker/metadata-action@c299e40c65443455700f0fdfc63efafe5b349051",
    "name:refuse version tag overwrite",
    "name:build image for local scan",
    "name:scan image for fixable CRITICAL/HIGH vulnerabilities",
    "name:publish release image by digest",
    "name:verify pushed image is the scanned image",
    "name:verify embedded provenance and SBOM",
    "name:install cosign",
    "name:sign image digest with GitHub OIDC",
    "name:verify image signature",
    "name:publish signed tags",
    "name:verify published tags",
    "name:publish summary",
]

GUARD_RUN = """if output=$(docker buildx imagetools inspect "${IMAGE}:${VERSION}" 2>&1); then
  echo "error: ${IMAGE}:${VERSION} already exists and is immutable" >&2
  exit 1
fi
if ! grep -Eqi 'manifest unknown|not found|no such manifest|name unknown' <<<"$output"; then
  echo "error: could not prove that ${IMAGE}:${VERSION} is unused" >&2
  printf '%s\\n' "$output" >&2
  exit 1
fi
"""

IDENTITY_RUN = """SCANNED_CONFIG=$(docker image inspect --format '{{.Id}}' "${SCAN_IMAGE}")
PLATFORM_DIGEST=$(
  docker buildx imagetools inspect "${IMAGE}@${DIGEST}" --format '{{json .Manifest}}' |
    jq -er '[.manifests[] | select(.platform.os == "linux" and .platform.architecture == "amd64")] | if length == 1 then .[0].digest else error("expected exactly one linux/amd64 manifest") end'
)
PUSHED_CONFIG=$(
  docker buildx imagetools inspect --raw "${IMAGE}@${PLATFORM_DIGEST}" |
    jq -er '.config.digest'
)
if [ "${SCANNED_CONFIG}" != "${PUSHED_CONFIG}" ]; then
  echo "error: pushed image config does not match the image that passed Trivy" >&2
  exit 1
fi
"""

PROVENANCE_RUN = """provenance=$(docker buildx imagetools inspect "${IMAGE}@${DIGEST}" --format '{{ json .Provenance.SLSA }}')
sbom=$(docker buildx imagetools inspect "${IMAGE}@${DIGEST}" --format '{{ json .SBOM.SPDX }}')
jq -e '
  .buildDefinition.buildType == "https://github.com/moby/buildkit/blob/master/docs/attestations/slsa-definitions.md"
  and (.buildDefinition.resolvedDependencies | type == "array" and length > 0)
  and (.runDetails.builder.id | type == "string" and length > 0)
' <<<"${provenance}" >/dev/null
jq -e '
  .spdxVersion == "SPDX-2.3"
  and (.documentNamespace | type == "string" and length > 0)
  and (.packages | type == "array" and length > 0)
' <<<"${sbom}" >/dev/null
"""

VERIFY_SIGNATURE_RUN = """cosign verify "${IMAGE}@${DIGEST}" \\
  --certificate-identity "https://github.com/${GITHUB_REPOSITORY}/.github/workflows/auth-image.yml@${GITHUB_REF}" \\
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" >/dev/null
"""

RUBY_PARSE = r"""
require "json"
require "yaml"
document = YAML.safe_load(STDIN.read, permitted_classes: [], permitted_symbols: [], aliases: false)
STDOUT.write(JSON.generate(document))
"""


class ContractError(AssertionError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ContractError(message)


def parse_yaml(text: str) -> dict[str, Any]:
    try:
        result = subprocess.run(
            ["ruby", "-rjson", "-ryaml", "-e", RUBY_PARSE],
            input=text,
            text=True,
            capture_output=True,
            check=False,
        )
    except OSError as error:
        raise ContractError(f"Ruby/Psych YAML parser is required: {error}") from error
    require(
        result.returncode == 0, f"workflow YAML parse failed: {result.stderr.strip()}"
    )
    try:
        document = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise ContractError(
            f"workflow parser returned invalid JSON: {error}"
        ) from error
    require(isinstance(document, dict), "workflow root must be a mapping")
    return document


def parsed_steps(document: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        steps = document["jobs"]["image"]["steps"]
    except (KeyError, TypeError) as error:
        raise ContractError("jobs.image.steps is required") from error
    require(isinstance(steps, list), "jobs.image.steps must be a list")
    require(
        all(isinstance(item, dict) for item in steps),
        "every workflow step must be a mapping",
    )
    return steps


def step_identity(item: dict[str, Any]) -> str:
    if "name" in item:
        return f"name:{item['name']}"
    if "uses" in item:
        return f"uses:{item['uses']}"
    return "unknown"


def named_steps(steps: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in steps:
        name = item.get("name")
        if name is None:
            continue
        require(isinstance(name, str), "step name must be a string")
        require(name not in result, f"duplicate step name: {name}")
        result[name] = item
    return result


def require_exact(actual: Any, expected: Any, label: str) -> None:
    if actual == expected:
        return
    actual_json = json.dumps(actual, sort_keys=True, separators=(",", ":"))
    expected_json = json.dumps(expected, sort_keys=True, separators=(",", ":"))
    raise ContractError(
        f"{label} changed\nexpected: {expected_json}\nactual:   {actual_json}"
    )


def validate(text: str) -> None:
    document = parse_yaml(text)
    jobs = document.get("jobs")
    require(isinstance(jobs, dict), "workflow jobs must be a mapping")
    require(set(jobs) == {"image"}, f"unexpected workflow jobs: {sorted(jobs)}")
    steps = parsed_steps(document)
    require(len(steps) == 17, f"expected exactly 17 image steps, got {len(steps)}")
    require_exact(
        [step_identity(item) for item in steps], EXPECTED_ORDER, "image step order"
    )

    canonical = json.dumps(steps, sort_keys=True, separators=(",", ":")).encode()
    actual_hash = hashlib.sha256(canonical).hexdigest()
    require(
        actual_hash == EXPECTED_STEPS_SHA256,
        f"parsed image-step contract changed: expected {EXPECTED_STEPS_SHA256}, got {actual_hash}",
    )

    events = document.get("on", document.get("true"))
    if events is None:
        events = document.get(
            True
        )  # Psych treats unquoted `on` as a YAML 1.1 boolean key.
    require(isinstance(events, dict), "workflow triggers must be a mapping")
    contract_path = ".github/tests/test_auth_image_workflow.py"
    for event_name in ("push", "pull_request"):
        event = events.get(event_name)
        require(isinstance(event, dict), f"{event_name} trigger must be a mapping")
        require(
            contract_path in event.get("paths", []),
            f"{event_name} must watch the contract test",
        )

    require_exact(
        document.get("permissions"),
        {"contents": "read", "packages": "write", "id-token": "write"},
        "workflow permissions",
    )

    by_name = named_steps(steps)
    require_exact(
        by_name["refuse version tag overwrite"],
        {
            "name": "refuse version tag overwrite",
            "if": "github.ref_type == 'tag'",
            "env": {"VERSION": "${{ steps.meta.outputs.version }}"},
            "run": GUARD_RUN,
        },
        "immutable version-tag guard",
    )
    require_exact(
        by_name["scan image for fixable CRITICAL/HIGH vulnerabilities"],
        {
            "name": "scan image for fixable CRITICAL/HIGH vulnerabilities",
            "uses": "aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25",
            "with": {
                "image-ref": "${{ env.SCAN_IMAGE }}",
                "version": "v0.72.0",
                "format": "table",
                "exit-code": "1",
                "ignore-unfixed": True,
                "vuln-type": "os,library",
                "severity": "CRITICAL,HIGH",
                "scanners": "vuln",
            },
        },
        "Trivy gate",
    )
    require_exact(
        by_name["publish release image by digest"],
        {
            "name": "publish release image by digest",
            "if": NON_PR,
            "id": "release",
            "uses": "docker/build-push-action@10e90e3645eae34f1e60eeb005ba3a3d33f178e8",
            "with": {
                "context": "auth",
                "platforms": "linux/amd64",
                "labels": "${{ steps.meta.outputs.labels }}",
                "outputs": "type=image,name=${{ env.IMAGE }},push-by-digest=true,name-canonical=true,push=true",
                "provenance": "mode=max",
                "sbom": True,
                "cache-from": "type=gha",
                "cache-to": "type=gha,mode=max",
            },
        },
        "digest-only release build",
    )
    require_exact(
        by_name["verify pushed image is the scanned image"],
        {
            "name": "verify pushed image is the scanned image",
            "if": NON_PR,
            "env": RELEASE_DIGEST_ENV,
            "run": IDENTITY_RUN,
        },
        "scanned-to-pushed config identity gate",
    )
    require_exact(
        by_name["verify embedded provenance and SBOM"],
        {
            "name": "verify embedded provenance and SBOM",
            "if": NON_PR,
            "env": RELEASE_DIGEST_ENV,
            "run": PROVENANCE_RUN,
        },
        "provenance and SBOM gate",
    )
    require_exact(
        by_name["sign image digest with GitHub OIDC"],
        {
            "name": "sign image digest with GitHub OIDC",
            "if": NON_PR,
            "env": RELEASE_DIGEST_ENV,
            "run": 'cosign sign --yes "${IMAGE}@${DIGEST}"',
        },
        "cosign signing gate",
    )
    require_exact(
        by_name["verify image signature"],
        {
            "name": "verify image signature",
            "if": NON_PR,
            "env": RELEASE_DIGEST_ENV,
            "run": VERIFY_SIGNATURE_RUN,
        },
        "cosign signature verification gate",
    )

    for item in steps:
        require(
            "continue-on-error" not in item, f"{step_identity(item)} must fail closed"
        )
        run = item.get("run", "")
        require(
            isinstance(run, str), f"{step_identity(item)} run body must be a string"
        )
        if "docker buildx imagetools create" in run:
            require(
                item.get("name") == "publish signed tags"
                and run.count("docker buildx imagetools create") == 1,
                f"unexpected tag publication in {step_identity(item)}",
            )
        for forbidden in (
            "docker push ",
            "crane push ",
            "oras push ",
            "skopeo copy ",
            "regctl image copy ",
        ):
            require(
                forbidden not in run,
                f"unexpected registry publication in {step_identity(item)}",
            )
        if item.get("uses", "").startswith("docker/build-push-action@"):
            require(
                item.get("name")
                in {"build image for local scan", "publish release image by digest"},
                f"unexpected image build/publish action: {step_identity(item)}",
            )


def raw_step(text: str, name: str) -> tuple[int, str]:
    marker = f"      - name: {name}\n"
    start = text.find(marker)
    require(start >= 0, f"mutation fixture cannot find step: {name}")
    end = text.find("\n      - ", start + len(marker))
    return start, text[start : len(text) if end < 0 else end]


def mutate_step(text: str, name: str, old: str, new: str) -> str:
    start, block = raw_step(text, name)
    require(old in block, f"mutation source missing in {name}: {old!r}")
    changed = block.replace(old, new, 1)
    return text[:start] + changed + text[start + len(block) :]


def replace_step_run(text: str, name: str, body: str) -> str:
    start, block = raw_step(text, name)
    marker = "        run: |\n"
    run_start = block.find(marker)
    require(run_start >= 0, f"mutation fixture requires a block run step: {name}")
    indented = "".join(f"          {line}\n" for line in body.splitlines())
    changed = block[:run_start] + marker + indented
    return text[:start] + changed + text[start + len(block) :]


def must_reject(text: str, mutator: Callable[[str], str], case: str) -> None:
    mutated = mutator(text)
    try:
        validate(mutated)
    except ContractError:
        return
    raise ContractError(f"validator accepted unsafe mutation: {case}")


def main() -> int:
    text = WORKFLOW.read_text(encoding="utf-8")
    validate(text)

    harmless_comment = text.replace(
        "      - name: scan image for fixable CRITICAL/HIGH vulnerabilities\n",
        "      # Comments are intentionally absent from the parsed contract.\n"
        "      - name: scan image for fixable CRITICAL/HIGH vulnerabilities\n",
        1,
    )
    validate(harmless_comment)

    must_reject(
        text,
        lambda value: mutate_step(
            value,
            "scan image for fixable CRITICAL/HIGH vulnerabilities",
            "      - name: scan image for fixable CRITICAL/HIGH vulnerabilities\n",
            "      - name: scan image for fixable CRITICAL/HIGH vulnerabilities\n        if : false\n",
        ),
        "Trivy if:false",
    )
    must_reject(
        text,
        lambda value: mutate_step(
            value,
            "scan image for fixable CRITICAL/HIGH vulnerabilities",
            "        uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0\n",
            "        uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09\n"
            "        # uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0\n",
        ),
        "checkout substituted for comment-shadowed Trivy",
    )
    must_reject(
        text,
        lambda value: mutate_step(
            value,
            "scan image for fixable CRITICAL/HIGH vulnerabilities",
            '          exit-code: "1"\n',
            '          exit-code: "0" # exit-code: "1"\n',
        ),
        "comment-shadowed advisory Trivy exit code",
    )
    must_reject(
        text,
        lambda value: mutate_step(
            value,
            "scan image for fixable CRITICAL/HIGH vulnerabilities",
            "          severity: CRITICAL,HIGH\n",
            "          severity: UNKNOWN # severity: CRITICAL,HIGH\n",
        ),
        "Trivy severity UNKNOWN",
    )

    inert_guard = (
        "cat <<'IMMUTABILITY_GUARD' >/dev/null\n"
        + GUARD_RUN
        + "IMMUTABILITY_GUARD\nexit 0"
    )
    must_reject(
        text,
        lambda value: replace_step_run(
            value, "refuse version tag overwrite", inert_guard
        ),
        "heredoc/no-op immutable-tag guard",
    )

    unsigned_step = """      - name: unsigned latest bypass
        if: github.event_name != 'pull_request'
        run: docker buildx imagetools create --tag "${IMAGE}:latest" "${IMAGE}@${DIGEST}"

"""
    must_reject(
        text,
        lambda value: value.replace(
            "      - name: verify pushed image is the scanned image\n",
            unsigned_step + "      - name: verify pushed image is the scanned image\n",
            1,
        ),
        "unexpected unsigned latest tag publication",
    )
    must_reject(
        text,
        lambda value: (
            value
            + "\n  unsigned-publisher:\n"
            + "    runs-on: ubuntu-24.04\n"
            + "    steps:\n"
            + "      - run: docker buildx imagetools create --tag '${IMAGE}:latest' '${IMAGE}@${DIGEST}'\n"
        ),
        "unexpected publication job",
    )
    must_reject(
        text,
        lambda value: mutate_step(
            mutate_step(
                value,
                "publish release image by digest",
                "          provenance: mode=max\n",
                "          provenance: false # provenance: mode=max\n",
            ),
            "publish release image by digest",
            "          sbom: true\n",
            "          sbom: false # sbom: true\n",
        ),
        "comment-shadowed disabled provenance and SBOM",
    )

    inert_validation = (
        "cat <<'ATTESTATION_VALIDATION' >/dev/null\n"
        + PROVENANCE_RUN
        + "ATTESTATION_VALIDATION\nexit 0"
    )
    must_reject(
        text,
        lambda value: replace_step_run(
            value, "verify embedded provenance and SBOM", inert_validation
        ),
        "heredoc/no-op provenance and SBOM validation",
    )

    for name in (
        "publish release image by digest",
        "verify pushed image is the scanned image",
        "verify embedded provenance and SBOM",
        "install cosign",
        "sign image digest with GitHub OIDC",
        "verify image signature",
        "publish signed tags",
        "verify published tags",
        "publish summary",
    ):
        must_reject(
            text,
            lambda value, step_name=name: mutate_step(
                value, step_name, f"        if: {NON_PR}\n", "        if : false\n"
            ),
            f"disabled non-PR step: {name}",
        )

    must_reject(
        text,
        lambda value: mutate_step(
            value,
            "sign image digest with GitHub OIDC",
            '        run: cosign sign --yes "${IMAGE}@${DIGEST}"\n',
            "        run: echo signing skipped\n",
        ),
        "no-op signing",
    )
    must_reject(
        text,
        lambda value: replace_step_run(
            value, "verify image signature", "echo signature verification skipped"
        ),
        "no-op signature verification",
    )

    print(
        "auth-image parsed workflow contract: ok "
        "(17 exact steps; comments cannot satisfy gates; unexpected publication denied)"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ContractError as error:
        print(
            f"auth-image workflow publication contract: FAIL: {error}", file=sys.stderr
        )
        raise SystemExit(1)
