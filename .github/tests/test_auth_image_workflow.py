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
CONTRACT_PATH = ".github/tests/test_auth_image_workflow.py"

# Mutation tests recompute these deliberately, so unsafe changes must still hit
# their targeted semantic guards even if an attacker refreshes canonical hashes.
EXPECTED_HASHES = {
    "workflow": "03faf068c56b84e7b1d40539e1146da69fbf03c9891eeed2955eb9d66c8613e6",
    "pr-image": "f5cb87dca90b078d9ab8e84793b06839dfb5b827b742805f040d7ff821598d57",
    "publish-image": "f7776c56c97f58962ada8e58003bec2b67209857cdcb09342bd197a629cafe55",
}

WATCHED_PATHS = ["auth/**", ".github/workflows/auth-image.yml", CONTRACT_PATH]
EXPECTED_TRIGGERS = {
    "push": {"branches": ["main"], "tags": ["auth-v*"], "paths": WATCHED_PATHS},
    "pull_request": {"paths": WATCHED_PATHS},
    "workflow_dispatch": None,
}
PR_ONLY = "github.event_name == 'pull_request'"
NON_PR = "github.event_name != 'pull_request'"
RELEASE_DIGEST_ENV = {"DIGEST": "${{ steps.release.outputs.digest }}"}
PR_SAFE_PERMISSIONS = {"contents": "read", "packages": "none", "id-token": "none"}

CHECKOUT = {
    "uses": "actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09",
    "with": {"persist-credentials": False},
}
CONTRACT_TEST = {
    "name": "test fail-closed publication contract",
    "run": ".github/tests/test_auth_image_workflow.py",
}
SETUP_BUILDX = {
    "uses": "docker/setup-buildx-action@8d2750c68a42422c14e847fe6c8ac0403b4cbd6f"
}
LOGIN = {
    "uses": "docker/login-action@c94ce9fb468520275223c153574b00df6fe4bcc9",
    "with": {
        "registry": "ghcr.io",
        "username": "${{ github.actor }}",
        "password": "${{ secrets.GITHUB_TOKEN }}",
    },
}
LABELS = """org.opencontainers.image.title=inspr-auth
org.opencontainers.image.description=OIDC session and signup bridge for inspr.at (/enter, /login, /welcome, /logout)
org.opencontainers.image.licenses=AGPL-3.0-only
"""
PUBLISH_TAG_RULES = """type=ref,event=branch,enable=${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
type=raw,value=sha-${{ github.sha }},enable=${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
type=match,pattern=auth-v(.*),group=1
type=raw,value=latest,enable=${{ startsWith(github.ref, 'refs/tags/auth-v') }}
type=raw,value=manual-${{ github.run_id }}-${{ github.run_attempt }},enable=${{ github.event_name == 'workflow_dispatch' }}
"""
PR_METADATA = {
    "uses": "docker/metadata-action@c299e40c65443455700f0fdfc63efafe5b349051",
    "id": "meta",
    "with": {"images": "${{ env.IMAGE }}", "labels": LABELS},
}
PUBLISH_METADATA = {
    "uses": "docker/metadata-action@c299e40c65443455700f0fdfc63efafe5b349051",
    "id": "meta",
    "with": {"images": "${{ env.IMAGE }}", "tags": PUBLISH_TAG_RULES, "labels": LABELS},
}
LOCAL_BUILD = {
    "name": "build image for local scan",
    "uses": "docker/build-push-action@10e90e3645eae34f1e60eeb005ba3a3d33f178e8",
    "with": {
        "context": "auth",
        "platforms": "linux/amd64",
        "push": False,
        "load": True,
        "tags": "${{ env.SCAN_IMAGE }}",
        "labels": "${{ steps.meta.outputs.labels }}",
        "provenance": False,
        "sbom": False,
        "cache-from": "type=gha",
        "cache-to": "type=gha,mode=max",
    },
}
TRIVY = {
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
}
RELEASE_BUILD = {
    "name": "publish release image by digest",
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
}

PR_ORDER = [
    "uses:actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09",
    "name:test fail-closed publication contract",
    "uses:docker/setup-buildx-action@8d2750c68a42422c14e847fe6c8ac0403b4cbd6f",
    "uses:docker/metadata-action@c299e40c65443455700f0fdfc63efafe5b349051",
    "name:build image for local scan",
    "name:scan image for fixable CRITICAL/HIGH vulnerabilities",
]
PUBLISH_ORDER = [
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
PUBLISH_TAGS_RUN = """[[ "${DIGEST}" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "error: invalid release digest" >&2; exit 1; }
mapfile -t tags < <(printf '%s\\n' "${TAGS}" | sed '/^[[:space:]]*$/d')
((${#tags[@]} > 0)) || { echo "error: metadata produced no release tags" >&2; exit 1; }
args=()
for tag in "${tags[@]}"; do
  [[ "${tag}" == "${IMAGE}:"* ]] || { echo "error: tag is outside ${IMAGE}" >&2; exit 1; }
  tag_name=${tag#"${IMAGE}:"}
  [[ "${tag_name}" =~ ^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$ ]] || { echo "error: invalid release tag" >&2; exit 1; }
  if [[ "${tag_name}" =~ ^sha-[0-9a-f]{40}$ ]]; then
    if output=$(docker buildx imagetools inspect "${tag}" --format '{{json .Manifest}}' 2>&1); then
      existing=$(jq -er '.digest' <<<"${output}") || { echo "error: invalid manifest for ${tag}" >&2; exit 1; }
      [ "${existing}" = "${DIGEST}" ] || { echo "error: immutable ${tag} is already ${existing}, refusing ${DIGEST}" >&2; exit 1; }
    elif ! grep -Eqi 'manifest unknown|not found|no such manifest|name unknown' <<<"${output}"; then
      echo "error: could not prove that immutable ${tag} is unused" >&2
      printf '%s\\n' "${output}" >&2
      exit 1
    fi
  fi
  args+=(--tag "${tag}")
done
docker buildx imagetools create "${args[@]}" "${IMAGE}@${DIGEST}"
"""

RUBY_PARSE = r"""
require "json"
require "yaml"
source = STDIN.read
def reject_duplicate_keys(node, scanner, path = "$")
  case node
  when Psych::Nodes::Mapping
    seen = {}
    node.children.each_slice(2) do |key, value|
      raise "non-scalar YAML key at #{path}" unless key.is_a?(Psych::Nodes::Scalar)
      raise "tagged YAML key #{key.value.inspect} at #{path}" unless key.tag.nil?
      resolved = key.quoted ? key.value : scanner.tokenize(key.value)
      identity = [resolved.class.name, resolved]
      raise "duplicate YAML key #{key.value.inspect} at #{path}" if seen.key?(identity)
      seen[identity] = true
      reject_duplicate_keys(value, scanner, "#{path}.#{key.value}")
    end
  when Psych::Nodes::Sequence
    node.children.each_with_index { |child, index| reject_duplicate_keys(child, scanner, "#{path}[#{index}]") }
  else
    children = node.respond_to?(:children) ? node.children : nil
    children&.each { |child| reject_duplicate_keys(child, scanner, path) }
  end
end
syntax_tree = Psych.parse_stream(source)
scanner = Psych::ScalarScanner.new(Psych::ClassLoader::Restricted.new([], []))
reject_duplicate_keys(syntax_tree, scanner)
document = YAML.safe_load(source, permitted_classes: [], permitted_symbols: [], aliases: false)
STDOUT.write(JSON.generate(document))
"""


class ContractError(AssertionError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ContractError(message)


def require_exact(actual: Any, expected: Any, label: str) -> None:
    if actual == expected:
        return
    actual_json = json.dumps(actual, sort_keys=True, separators=(",", ":"))
    expected_json = json.dumps(expected, sort_keys=True, separators=(",", ":"))
    raise ContractError(
        f"{label} changed\nexpected: {expected_json}\nactual:   {actual_json}"
    )


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


def job_steps(job: dict[str, Any], name: str) -> list[dict[str, Any]]:
    steps = job.get("steps")
    require(isinstance(steps, list), f"jobs.{name}.steps must be a list")
    require(
        all(isinstance(step, dict) for step in steps),
        f"every jobs.{name} step must be a mapping",
    )
    return steps


def step_identity(step: dict[str, Any]) -> str:
    if "name" in step:
        return f"name:{step['name']}"
    if "uses" in step:
        return f"uses:{step['uses']}"
    return "unknown"


def named_steps(
    steps: list[dict[str, Any]], job_name: str
) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for step in steps:
        name = step.get("name")
        if name is None:
            continue
        require(isinstance(name, str), f"{job_name} step name must be a string")
        require(name not in result, f"duplicate {job_name} step name: {name}")
        result[name] = step
    return result


def canonical_hashes(document: dict[str, Any]) -> dict[str, str]:
    hashes = {
        "workflow": hashlib.sha256(
            json.dumps(document, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
    }
    jobs = document.get("jobs")
    if isinstance(jobs, dict):
        for name, job in jobs.items():
            if isinstance(job, dict) and isinstance(job.get("steps"), list):
                hashes[name] = hashlib.sha256(
                    json.dumps(
                        job["steps"], sort_keys=True, separators=(",", ":")
                    ).encode()
                ).hexdigest()
    return hashes


def validate_pr_safety(job: dict[str, Any], steps: list[dict[str, Any]]) -> None:
    require_exact(job.get("if"), PR_ONLY, "PR job condition")
    require_exact(job.get("permissions"), PR_SAFE_PERMISSIONS, "PR job permissions")
    for step in steps:
        uses = step.get("uses", "")
        run = step.get("run", "")
        require(isinstance(uses, str), "PR step action must be a string")
        require(isinstance(run, str), "PR step run body must be a string")
        require(
            not uses.startswith("docker/login-action@")
            and not uses.startswith("sigstore/cosign-installer@"),
            f"PR job contains registry/OIDC-capable step: {step_identity(step)}",
        )
        for command in (
            "docker push ",
            "docker buildx imagetools create",
            "cosign sign ",
            "crane push ",
            "oras push ",
            "skopeo copy ",
            "regctl image copy ",
        ):
            require(
                command not in run,
                f"PR job contains registry publication command: {step_identity(step)}",
            )
        if uses.startswith("docker/build-push-action@"):
            require(
                step.get("with", {}).get("push") is False,
                "PR Docker build must remain local",
            )


def validate_release_chain(steps: list[dict[str, Any]]) -> None:
    by_name = named_steps(steps, "publish-image")
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
        by_name["build image for local scan"], LOCAL_BUILD, "local scan build"
    )
    require_exact(
        by_name["scan image for fixable CRITICAL/HIGH vulnerabilities"],
        TRIVY,
        "Trivy gate",
    )
    require_exact(
        by_name["publish release image by digest"],
        RELEASE_BUILD,
        "digest-only release build",
    )
    require_exact(
        by_name["verify pushed image is the scanned image"],
        {
            "name": "verify pushed image is the scanned image",
            "env": RELEASE_DIGEST_ENV,
            "run": IDENTITY_RUN,
        },
        "scanned-to-pushed identity gate",
    )
    require_exact(
        by_name["verify embedded provenance and SBOM"],
        {
            "name": "verify embedded provenance and SBOM",
            "env": RELEASE_DIGEST_ENV,
            "run": PROVENANCE_RUN,
        },
        "provenance and SBOM gate",
    )
    require_exact(
        by_name["install cosign"],
        {
            "name": "install cosign",
            "uses": "sigstore/cosign-installer@398d4b0eeef1380460a10c8013a76f728fb906ac",
            "with": {"cosign-release": "v2.5.2"},
        },
        "cosign installer",
    )
    require_exact(
        by_name["sign image digest with GitHub OIDC"],
        {
            "name": "sign image digest with GitHub OIDC",
            "env": RELEASE_DIGEST_ENV,
            "run": 'cosign sign --yes "${IMAGE}@${DIGEST}"',
        },
        "verified digest signing source",
    )
    require_exact(
        by_name["verify image signature"],
        {
            "name": "verify image signature",
            "env": RELEASE_DIGEST_ENV,
            "run": VERIFY_SIGNATURE_RUN,
        },
        "digest signature verification gate",
    )
    publisher = by_name["publish signed tags"]
    run = publisher.get("run")
    require(isinstance(run, str), "signed tag publisher run body must be a string")
    creates = [
        line.strip()
        for line in run.splitlines()
        if line.strip().startswith("docker buildx imagetools create")
    ]
    require_exact(
        creates,
        ['docker buildx imagetools create "${args[@]}" "${IMAGE}@${DIGEST}"'],
        "signed tag source invariant",
    )
    require(
        '[[ "${tag_name}" =~ ^sha-[0-9a-f]{40}$ ]]' in run
        and '"${existing}" = "${DIGEST}"' in run
        and "could not prove that immutable ${tag} is unused" in run,
        "immutable sha tag guard is required",
    )
    require_exact(
        publisher,
        {
            "name": "publish signed tags",
            "env": {**RELEASE_DIGEST_ENV, "TAGS": "${{ steps.meta.outputs.tags }}"},
            "run": PUBLISH_TAGS_RUN,
        },
        "signed tag publication gate",
    )


def validate(text: str, expected_hashes: dict[str, str] = EXPECTED_HASHES) -> None:
    document = parse_yaml(text)
    require_exact(
        sorted(document),
        ["concurrency", "env", "jobs", "name", "permissions", "true"],
        "workflow root keys",
    )
    require_exact(document.get("name"), "auth-image", "workflow name")
    require_exact(document.get("true"), EXPECTED_TRIGGERS, "workflow triggers")
    require_exact(
        document.get("env"),
        {
            "IMAGE": "ghcr.io/inspr-at/inspr-site/inspr-auth",
            "SCAN_IMAGE": "ghcr.io/inspr-at/inspr-site/inspr-auth:scan-${{ github.run_id }}-${{ github.run_attempt }}",
        },
        "workflow environment",
    )
    require_exact(
        document.get("permissions"), PR_SAFE_PERMISSIONS, "workflow permissions"
    )
    require_exact(
        document.get("concurrency"),
        {
            "group": "auth-image-${{ github.event_name == 'pull_request' && github.ref || 'publish' }}",
            "cancel-in-progress": "${{ github.event_name == 'pull_request' }}",
        },
        "globally coupled publish concurrency",
    )
    jobs = document.get("jobs")
    require(isinstance(jobs, dict), "workflow jobs must be a mapping")
    require_exact(sorted(jobs), ["pr-image", "publish-image"], "workflow job isolation")
    pr_job = jobs["pr-image"]
    publish_job = jobs["publish-image"]
    require(isinstance(pr_job, dict), "jobs.pr-image must be a mapping")
    require(isinstance(publish_job, dict), "jobs.publish-image must be a mapping")
    expected_job_keys = ["if", "permissions", "runs-on", "steps", "timeout-minutes"]
    require_exact(sorted(pr_job), expected_job_keys, "PR job keys")
    require_exact(sorted(publish_job), expected_job_keys, "publish job keys")
    require_exact(pr_job.get("runs-on"), "ubuntu-24.04", "PR job runner")
    require_exact(publish_job.get("runs-on"), "ubuntu-24.04", "publish job runner")
    require_exact(pr_job.get("timeout-minutes"), 20, "PR job timeout")
    require_exact(publish_job.get("timeout-minutes"), 20, "publish job timeout")
    pr_steps = job_steps(pr_job, "pr-image")
    publish_steps = job_steps(publish_job, "publish-image")
    validate_pr_safety(pr_job, pr_steps)
    require_exact(publish_job.get("if"), NON_PR, "publish job condition")
    require_exact(
        publish_job.get("permissions"),
        {"contents": "read", "packages": "write", "id-token": "write"},
        "publish job permissions",
    )
    pr_eligible = [name for name, job in jobs.items() if job.get("if") == PR_ONLY]
    require_exact(pr_eligible, ["pr-image"], "same-repository PR job eligibility")
    require_exact([step_identity(step) for step in pr_steps], PR_ORDER, "PR step order")
    require_exact(
        [step_identity(step) for step in publish_steps],
        PUBLISH_ORDER,
        "required scan-to-tag security order",
    )
    require_exact(pr_steps[0], CHECKOUT, "PR checkout credential persistence")
    require_exact(publish_steps[0], CHECKOUT, "publish checkout credential persistence")
    require_exact(pr_steps[1], CONTRACT_TEST, "PR contract test")
    require_exact(publish_steps[1], CONTRACT_TEST, "publish contract test")
    require_exact(pr_steps[2], SETUP_BUILDX, "PR Buildx setup")
    require_exact(publish_steps[2], SETUP_BUILDX, "publish Buildx setup")
    require_exact(pr_steps[3], PR_METADATA, "PR metadata")
    require_exact(publish_steps[3], LOGIN, "registry login")
    require_exact(pr_steps[4], LOCAL_BUILD, "PR local image build")
    require_exact(pr_steps[5], TRIVY, "PR Trivy gate")
    tag_rules = publish_steps[4].get("with", {}).get("tags", "")
    require(isinstance(tag_rules, str), "publication tag rules must be a string")
    sha_rules = [line for line in tag_rules.splitlines() if "value=sha-" in line]
    require_exact(
        sha_rules,
        [
            "type=raw,value=sha-${{ github.sha }},enable=${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}"
        ],
        "main-only sha tag authority",
    )
    branch_rules = [
        line
        for line in tag_rules.splitlines()
        if line.startswith("type=ref,event=branch")
    ]
    require_exact(
        branch_rules,
        [
            "type=ref,event=branch,enable=${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}"
        ],
        "main-push-only branch tag authority",
    )
    require_exact(publish_steps[4], PUBLISH_METADATA, "publication metadata")
    validate_release_chain(publish_steps)
    create_count = 0
    for job_name, steps in (("pr-image", pr_steps), ("publish-image", publish_steps)):
        for step in steps:
            require(
                "continue-on-error" not in step,
                f"{job_name} {step_identity(step)} must fail closed",
            )
            run = step.get("run", "")
            require(isinstance(run, str), f"{job_name} run body must be a string")
            create_count += run.count("docker buildx imagetools create")
            for forbidden in (
                "docker push ",
                "crane push ",
                "oras push ",
                "skopeo copy ",
                "regctl image copy ",
            ):
                require(
                    forbidden not in run,
                    f"unexpected publication in {job_name} {step_identity(step)}",
                )
    require(create_count == 1, "exactly one final tag publication command is allowed")
    require_exact(
        canonical_hashes(document), expected_hashes, "canonical contract hashes"
    )


def job_span(text: str, job_name: str) -> tuple[int, int]:
    marker = f"  {job_name}:\n"
    start = text.find(marker)
    require(start >= 0, f"mutation fixture cannot find job: {job_name}")
    later_jobs = [
        position
        for name in ("pr-image", "publish-image")
        if (position := text.find(f"\n  {name}:\n", start + len(marker))) >= 0
    ]
    return start, min(later_jobs) if later_jobs else len(text)


def mutate_step(text: str, job_name: str, step_name: str, old: str, new: str) -> str:
    job_start, job_end = job_span(text, job_name)
    marker = f"      - name: {step_name}\n"
    start = text.find(marker, job_start, job_end)
    require(start >= 0, f"mutation fixture cannot find {job_name} step: {step_name}")
    end = text.find("\n      - ", start + len(marker), job_end)
    if end < 0:
        end = job_end
    block = text[start:end]
    require(old in block, f"mutation source missing in {step_name}: {old!r}")
    changed = block.replace(old, new, 1)
    return text[:start] + changed + text[end:]


def must_reject(
    text: str, mutator: Callable[[str], str], case: str, expected_error: str
) -> None:
    mutated = mutator(text)
    refreshed = canonical_hashes(parse_yaml(mutated))
    try:
        validate(mutated, refreshed)
    except ContractError as error:
        require(
            expected_error in str(error),
            f"unsafe mutation {case!r} hit {str(error)!r}, not targeted guard {expected_error!r}",
        )
        return
    raise ContractError(
        f"validator accepted unsafe mutation after canonical hashes were refreshed: {case}"
    )


def main(argv: list[str]) -> int:
    text = WORKFLOW.read_text(encoding="utf-8")
    if argv == ["--print-hashes"]:
        print(json.dumps(canonical_hashes(parse_yaml(text)), indent=2, sort_keys=True))
        return 0
    require(not argv, f"unsupported arguments: {' '.join(argv)}")
    validate(text)
    harmless_comment = text.replace(
        "      - name: scan image for fixable CRITICAL/HIGH vulnerabilities\n",
        "      # Parsed hashes intentionally ignore comments.\n      - name: scan image for fixable CRITICAL/HIGH vulnerabilities\n",
        1,
    )
    validate(harmless_comment)
    cases: list[tuple[Callable[[str], str], str, str]] = [
        (
            lambda value: value.replace(
                "permissions:\n  contents: read\n  packages: none\n  id-token: none\n",
                "permissions:\n  contents: read\n  packages: write\n  id-token: write\n",
                1,
            ),
            "workflow grants PR-triggered runs package/OIDC write",
            "workflow permissions",
        ),
        (
            lambda value: value.replace(
                "  pr-image:\n    if: github.event_name == 'pull_request'\n    permissions:\n      contents: read\n      packages: none\n      id-token: none\n",
                "  pr-image:\n    if: github.event_name == 'pull_request'\n    permissions:\n      contents: read\n      packages: none\n      id-token: write\n",
                1,
            ),
            "same-repository PR can mint an OIDC token",
            "PR job permissions",
        ),
        (
            lambda value: value.replace(
                "  publish-image:\n    if: github.event_name != 'pull_request'\n",
                "  publish-image:\n    if: github.event_name == 'pull_request'\n",
                1,
            ),
            "same-repository PR selects the privileged publisher",
            "publish job condition",
        ),
        (
            lambda value: value.replace(
                "persist-credentials: false", "persist-credentials: true", 1
            ),
            "PR checkout persists credentials",
            "PR checkout credential persistence",
        ),
        (
            lambda value: mutate_step(
                value,
                "pr-image",
                "test fail-closed publication contract",
                "        run: .github/tests/test_auth_image_workflow.py\n",
                "        run: docker buildx imagetools create --tag '${IMAGE}:pr-owned' '${SCAN_IMAGE}'\n",
            ),
            "same-repository PR publishes a controlled image",
            "PR job contains registry publication command",
        ),
        (
            lambda value: value.replace(
                "group: auth-image-${{ github.event_name == 'pull_request' && github.ref || 'publish' }}",
                "group: auth-image-${{ github.ref }}",
                1,
            ),
            "publishers do not share a global lane",
            "globally coupled publish concurrency",
        ),
        (
            lambda value: value.replace(
                "type=raw,value=sha-${{ github.sha }},enable=${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}",
                "type=raw,value=sha-${{ github.sha }}",
                1,
            ),
            "auth tag can overwrite main's sha tag",
            "main-only sha tag authority",
        ),
        (
            lambda value: value.replace(
                "type=ref,event=branch,enable=${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}",
                "type=ref,event=branch",
                1,
            ),
            "manual dispatch can overwrite main's branch tag",
            "main-push-only branch tag authority",
        ),
        (
            lambda value: mutate_step(
                value,
                "publish-image",
                "publish signed tags",
                '[[ "${tag_name}" =~ ^sha-[0-9a-f]{40}$ ]]; then',
                '[[ "${tag_name}" =~ ^never-a-sha$ ]]; then',
            ),
            "immutable sha conflict guard is disabled",
            "immutable sha tag guard",
        ),
        (
            lambda value: mutate_step(
                value,
                "publish-image",
                "scan image for fixable CRITICAL/HIGH vulnerabilities",
                '          exit-code: "1"\n',
                '          exit-code: "0"\n',
            ),
            "Trivy is advisory",
            "Trivy gate",
        ),
        (
            lambda value: mutate_step(
                value,
                "publish-image",
                "publish release image by digest",
                "          provenance: mode=max\n",
                "          provenance: false\n",
            ),
            "published digest omits provenance",
            "digest-only release build",
        ),
        (
            lambda value: mutate_step(
                value,
                "publish-image",
                "verify pushed image is the scanned image",
                "SCANNED_CONFIG=$(docker image inspect --format '{{.Id}}' \"${SCAN_IMAGE}\")",
                'SCANNED_CONFIG="verification-skipped"',
            ),
            "scanned-to-pushed identity check is replaced",
            "scanned-to-pushed identity gate",
        ),
        (
            lambda value: mutate_step(
                value,
                "publish-image",
                "verify embedded provenance and SBOM",
                'provenance=$(docker buildx imagetools inspect "${IMAGE}@${DIGEST}"',
                "provenance='{}' # docker buildx imagetools inspect \"${IMAGE}@${DIGEST}\"",
            ),
            "attestation inspection is replaced",
            "provenance and SBOM gate",
        ),
        (
            lambda value: mutate_step(
                value,
                "publish-image",
                "sign image digest with GitHub OIDC",
                '        run: cosign sign --yes "${IMAGE}@${DIGEST}"\n',
                '        run: cosign sign --yes "${IMAGE}:unsigned-staging"\n',
            ),
            "signature is attached to unsigned staging",
            "verified digest signing source",
        ),
        (
            lambda value: mutate_step(
                value,
                "publish-image",
                "verify image signature",
                'cosign verify "${IMAGE}@${DIGEST}"',
                'echo "signature verification skipped for ${IMAGE}@${DIGEST}"',
            ),
            "signature verification is replaced",
            "digest signature verification gate",
        ),
        (
            lambda value: mutate_step(
                value,
                "publish-image",
                "verify image signature",
                "      - name: verify image signature\n",
                "      - name: verify image signature\n        continue-on-error: true\n",
            ),
            "signature verification is advisory",
            "digest signature verification gate",
        ),
        (
            lambda value: mutate_step(
                value,
                "publish-image",
                "publish signed tags",
                'docker buildx imagetools create "${args[@]}" "${IMAGE}@${DIGEST}"',
                'docker buildx imagetools create "${args[@]}" "${SCAN_IMAGE}"',
            ),
            "final tags source unsigned local staging",
            "signed tag source invariant",
        ),
        (
            lambda value: mutate_step(
                value,
                "publish-image",
                "publish signed tags",
                'docker buildx imagetools create "${args[@]}" "${IMAGE}@${DIGEST}"',
                'docker buildx imagetools create "${args[@]}" "docker.io/attacker/image@${DIGEST}"',
            ),
            "final tags source another repository",
            "signed tag source invariant",
        ),
    ]
    for mutator, case, expected_error in cases:
        must_reject(text, mutator, case, expected_error)
    print(
        "auth-image publication contract: ok "
        "(PR least privilege; refreshed-hash mutations rejected; "
        "scan->digest->identity->attest->sign/verify->tags; commit-safe sha authority)"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except ContractError as error:
        print(
            f"auth-image workflow publication contract: FAIL: {error}", file=sys.stderr
        )
        raise SystemExit(1)
