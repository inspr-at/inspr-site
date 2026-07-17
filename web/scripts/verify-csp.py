#!/usr/bin/env python3
"""Verify every inline <script> across all built and archived pages has its
SHA-256 hash pinned in Caddyfile's CSP `script-src` directive.

Walks web/dist/**/*.html and the frozen site/**/*.html archive, computes
hashes for every inline <script> (skipping external src= scripts), and asserts
each one appears in the Caddyfile. Exit non-zero on any drift; prints the
missing hashes for paste-in.

Run before any deploy that touches Base.astro, JSON-LD content, or any
inlined script body.
"""
from __future__ import annotations

import base64
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
DIST = ROOT / "web" / "dist"
ARCHIVE = ROOT / "site"
CADDYFILE = ROOT / "Caddyfile"

if not DIST.exists():
    sys.exit(f"missing build output: {DIST}\nrun `cd web && npm run build` first")
if not ARCHIVE.exists():
    sys.exit(f"missing frozen archive: {ARCHIVE}")

caddy = CADDYFILE.read_text(encoding="utf-8")
pinned = set(re.findall(r"sha256-[A-Za-z0-9+/=]+", caddy))

# Match <script ...>BODY</script> where BODY is non-empty and there is
# no src= attribute (those are external, served from origin under 'self').
INLINE_SCRIPT = re.compile(
    r'<script(?P<attrs>(?:\s[^>]*)?)>(?P<body>.*?)</script>',
    re.S,
)

found: dict[str, list[str]] = {}  # hash → list of (file, kind, size) descriptors
problems: list[str] = []

html_paths = sorted(DIST.rglob("*.html")) + sorted(ARCHIVE.rglob("*.html"))

for html_path in html_paths:
    rel = html_path.relative_to(ROOT)
    html = html_path.read_text(encoding="utf-8")
    for m in INLINE_SCRIPT.finditer(html):
        attrs = m.group("attrs") or ""
        body = m.group("body")
        if not body.strip():
            continue
        if "src=" in attrs:
            continue  # external; covered by 'self'
        digest = hashlib.sha256(body.encode("utf-8")).digest()
        b64 = base64.b64encode(digest).decode("ascii")
        token = f"sha256-{b64}"
        kind = (
            "json-ld" if "@context" in body
            else "theme-init" if "inspr-theme" in body
            else "other"
        )
        found.setdefault(token, []).append(f"{rel}  {kind}  {len(body)}B")

if not found:
    print("WARN: no inline scripts found in dist", file=sys.stderr)
    sys.exit(0)

for token, occurrences in sorted(found.items()):
    if token in pinned:
        print(f"OK  {token}")
        for o in occurrences:
            print(f"    {o}")
    else:
        problems.append(token)
        print(f"FAIL {token}  NOT PINNED IN CADDYFILE", file=sys.stderr)
        for o in occurrences:
            print(f"    {o}", file=sys.stderr)

if problems:
    print("", file=sys.stderr)
    print("Add the following to script-src in Caddyfile:", file=sys.stderr)
    for p in problems:
        print(f"  '{p}'", file=sys.stderr)
    sys.exit(1)

# Also report any hashes pinned in Caddyfile that no longer appear in any
# inline script — safe to remove.
pinned_unused = [p for p in pinned if p not in found]
if pinned_unused:
    print("\nNote: pinned hashes no longer used (can be removed):", file=sys.stderr)
    for p in pinned_unused:
        print(f"  {p}", file=sys.stderr)
