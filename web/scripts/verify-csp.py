#!/usr/bin/env python3
"""Verify the SHA-256 CSP hash pinned in Caddyfile.v1 matches the inline
JSON-LD body Astro is currently producing.

Run after every change to Base.astro's JSON-LD payload, OR before deploy:
    python3 web/scripts/verify-csp.py

Exit 0 = match. Exit 1 = drift; updated hash printed to stderr for paste-in.
"""
from __future__ import annotations

import base64
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
DIST = ROOT / "web" / "dist" / "index.html"
# Post-launch the active config lives at ./Caddyfile (Caddyfile.v1 was
# promoted in place during the v1 deploy).
CADDYFILE = ROOT / "Caddyfile"

if not DIST.exists():
    sys.exit(f"missing build output: {DIST}\nrun `cd web && npm run build` first")

html = DIST.read_text(encoding="utf-8")
match = re.search(
    r'<script type="application/ld\+json">(.*?)</script>',
    html,
    re.S,
)
if not match:
    sys.exit("no inline JSON-LD <script> found in dist/index.html")

body = match.group(1)
digest = hashlib.sha256(body.encode("utf-8")).digest()
expected = "sha256-" + base64.b64encode(digest).decode("ascii")

caddy = CADDYFILE.read_text(encoding="utf-8")
if expected in caddy:
    print(f"OK  {expected} matches Caddyfile.v1", file=sys.stderr)
    sys.exit(0)

# Drift: surface the new hash and the old one for diffing.
old_hashes = re.findall(r"sha256-[A-Za-z0-9+/=]+", caddy)
print("DRIFT — Caddyfile.v1 needs updating:", file=sys.stderr)
print(f"  expected: {expected}", file=sys.stderr)
for o in old_hashes:
    print(f"  pinned:   {o}", file=sys.stderr)
sys.exit(1)
