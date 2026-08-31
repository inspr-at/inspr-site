#!/usr/bin/env python3
"""Fail-closed contract tests for the auth image publication workflow."""

from __future__ import annotations

import pathlib
import re
import sys


WORKFLOW = pathlib.Path(__file__).parents[1] / "workflows" / "auth-image.yml"


class ContractError(AssertionError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ContractError(message)


def step(text: str, name: str) -> tuple[int, str]:
    marker = f"      - name: {name}\n"
    start = text.find(marker)
    require(start >= 0, f"missing required step: {name}")
    end = text.find("\n      - ", start + len(marker))
    return start, text[start : len(text) if end < 0 else end]


def validate(text: str) -> None:
    required_order = [
        "test fail-closed publication contract",
        "refuse version tag overwrite",
        "build image for local scan",
        "scan image for fixable CRITICAL/HIGH vulnerabilities",
        "publish release image by digest",
        "verify pushed image is the scanned image",
        "verify embedded provenance and SBOM",
        "sign image digest with GitHub OIDC",
        "verify image signature",
        "publish signed tags",
        "verify published tags",
        "publish summary",
    ]
    blocks = {name: step(text, name) for name in required_order}
    positions = [blocks[name][0] for name in required_order]
    require(positions == sorted(positions), "security and publication steps are out of order")

    contract_test = blocks["test fail-closed publication contract"][1]
    require(
        "run: .github/tests/test_auth_image_workflow.py" in contract_test,
        "workflow must execute this publication contract test",
    )
    require(
        text.count('.github/tests/test_auth_image_workflow.py') == 3,
        "contract test must be wired into push paths, pull-request paths, and the job",
    )

    guard = blocks["refuse version tag overwrite"][1]
    require("if: github.ref_type == 'tag'" in guard, "version immutability guard must cover tag events")
    require("could not prove" in guard and "exit 1" in guard, "version guard must fail closed")

    local = blocks["build image for local scan"][1]
    for token in (
        "push: false",
        "load: true",
        "tags: ${{ env.SCAN_IMAGE }}",
        "provenance: false",
        "sbom: false",
    ):
        require(token in local, f"local scan build must contain {token!r}")
    require("steps.meta.outputs.tags" not in local, "local scan build must not use release tags")

    scan = blocks["scan image for fixable CRITICAL/HIGH vulnerabilities"][1]
    require("image-ref: ${{ env.SCAN_IMAGE }}" in scan, "Trivy must scan the locally loaded image")
    require('exit-code: "1"' in scan, "Trivy findings must fail the job")
    require("continue-on-error" not in scan, "Trivy must not be advisory")

    publish_digest = blocks["publish release image by digest"][1]
    for token in (
        "if: github.event_name != 'pull_request'",
        "id: release",
        "push-by-digest=true",
        "name-canonical=true",
        "push=true",
        "provenance: mode=max",
        "sbom: true",
    ):
        require(token in publish_digest, f"digest publication must contain {token!r}")
    require("tags:" not in publish_digest, "digest publication must not create release tags")

    identity = blocks["verify pushed image is the scanned image"][1]
    require("docker image inspect" in identity, "scanned local image identity must be read")
    require("docker buildx imagetools inspect" in identity, "pushed image identity must be read")
    require("SCANNED_CONFIG" in identity and "PUSHED_CONFIG" in identity, "image configs must be compared")

    provenance = blocks["verify embedded provenance and SBOM"][1]
    require("steps.release.outputs.digest" in provenance, "attestations must be checked on the untagged digest")

    signing = blocks["sign image digest with GitHub OIDC"][1]
    signature = blocks["verify image signature"][1]
    for block, label in ((signing, "signing"), (signature, "signature verification")):
        require("steps.release.outputs.digest" in block, f"{label} must target the release digest")

    publish_tags = blocks["publish signed tags"][1]
    for token in ("steps.release.outputs.digest", "steps.meta.outputs.tags", "imagetools create"):
        require(token in publish_tags, f"tag publication must contain {token!r}")
    require("docker push" not in text, "release tags must only be created from the signed digest")

    verify_tags = blocks["verify published tags"][1]
    require("steps.release.outputs.digest" in verify_tags, "published tags must be compared with the signed digest")
    require("steps.meta.outputs.tags" in verify_tags, "every metadata tag must be verified")

    forbidden_tag_push = re.search(r"^\s+push:\s*(?:true|\$\{\{)", text, re.MULTILINE)
    require(forbidden_tag_push is None, "build-push-action must never publish release tags directly")


def must_reject(text: str, old: str, new: str, case: str) -> None:
    require(old in text, f"self-test mutation source missing for {case}")
    mutated = text.replace(old, new, 1)
    try:
        validate(mutated)
    except ContractError:
        return
    raise ContractError(f"validator accepted unsafe mutation: {case}")


def main() -> int:
    text = WORKFLOW.read_text(encoding="utf-8")
    validate(text)
    must_reject(text, 'exit-code: "1"', 'exit-code: "0"', "advisory vulnerability scan")
    must_reject(
        text,
        'exit-code: "1"',
        'exit-code: "1"\n        continue-on-error: true',
        "ignored failing vulnerability scan",
    )
    must_reject(text, "push-by-digest=true", "push-by-digest=false", "taggable pre-sign push")
    must_reject(
        text,
        "      - name: verify image signature\n",
        "      - name: verify image signature late\n",
        "missing pre-publication signature verification",
    )
    must_reject(text, "imagetools create", "docker push", "direct unsigned tag publication")
    print("auth-image workflow publication contract: ok (a failing scan reaches no registry or tag publication step)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ContractError as error:
        print(f"auth-image workflow publication contract: FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
