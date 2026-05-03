#!/usr/bin/env python3
"""Generate an image via OpenRouter's image-capable models.

Usage:
    source /tmp/.inspr-or.env
    export OPENROUTER_API_KEY
    python3 web/scripts/gen-image.py \\
        --model google/gemini-3-pro-image-preview \\
        --out web/src/assets/hero.png \\
        --prompt-file /tmp/prompt.txt

Or pass --prompt directly. Saves the first returned image as PNG (model returns
PNG in a data:image/png;base64,... URL inside choices[0].message.images[0].image_url.url).
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request

API = "https://openrouter.ai/api/v1/chat/completions"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="google/gemini-3-pro-image-preview")
    ap.add_argument("--out", required=True, help="output path (.png)")
    ap.add_argument("--prompt", help="prompt text inline")
    ap.add_argument("--prompt-file", help="path to a file holding the prompt")
    ap.add_argument("--retries", type=int, default=2)
    args = ap.parse_args()

    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        sys.exit("OPENROUTER_API_KEY not set")

    if args.prompt_file:
        prompt = pathlib.Path(args.prompt_file).read_text(encoding="utf-8").strip()
    elif args.prompt:
        prompt = args.prompt
    else:
        sys.exit("need --prompt or --prompt-file")

    payload = {
        "model": args.model,
        "messages": [{"role": "user", "content": prompt}],
        "modalities": ["image", "text"],
    }
    body = json.dumps(payload).encode("utf-8")

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://inspr.at",
        "X-Title": "inspr.at v1 image gen",
        "User-Agent": "inspr-at-image-gen/1.0",
    }

    last_err: str | None = None
    for attempt in range(args.retries + 1):
        req = urllib.request.Request(API, data=body, method="POST", headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                break
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}: {e.read().decode()}"
            print(f"  attempt {attempt+1}/{args.retries+1}: {last_err}", file=sys.stderr)
            if attempt == args.retries:
                sys.exit(last_err)
        except urllib.error.URLError as e:
            last_err = str(e)
            print(f"  attempt {attempt+1}/{args.retries+1}: {last_err}", file=sys.stderr)
            if attempt == args.retries:
                sys.exit(last_err)
    else:
        sys.exit(f"all retries exhausted: {last_err}")

    # Pull image bytes out of the response. OpenRouter wraps Gemini's
    # output in choices[].message.images[].image_url.url as data URL.
    msg = data["choices"][0]["message"]
    images = msg.get("images") or []
    if not images:
        # Some models embed the image as inline content with a data URL
        content = msg.get("content")
        if isinstance(content, list):
            for c in content:
                if c.get("type") == "image_url":
                    images = [c]
                    break
        elif isinstance(content, str):
            m = re.search(r"data:image/[a-z]+;base64,([A-Za-z0-9+/=]+)", content)
            if m:
                images = [{"image_url": {"url": f"data:image/png;base64,{m.group(1)}"}}]

    if not images:
        # Print the model's text response to help debug
        text = msg.get("content") if isinstance(msg.get("content"), str) else ""
        sys.exit(f"no image in response. model said: {text[:300]!r}\nraw: {json.dumps(data)[:500]}")

    url = images[0]["image_url"]["url"]
    mime_match = re.match(r"data:(image/[a-zA-Z+]+);base64,", url)
    if not mime_match:
        sys.exit(f"unexpected image url format: {url[:80]!r}")

    mime = mime_match.group(1)
    ext_map = {
        "image/jpeg": ".jpg", "image/jpg": ".jpg",
        "image/png": ".png", "image/webp": ".webp",
        "image/avif": ".avif",
    }
    real_ext = ext_map.get(mime, ".bin")

    base64_data = url.split(",", 1)[1]
    img_bytes = base64.b64decode(base64_data)

    out = pathlib.Path(args.out)
    # Auto-correct extension to the actual mime returned (Gemini often returns
    # JPEG even when the file is named .png).
    if out.suffix != real_ext:
        out = out.with_suffix(real_ext)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(img_bytes)

    usage = data.get("usage") or {}
    print(f"OK  wrote {len(img_bytes):,} bytes → {out} ({mime})")
    print(f"    model: {data.get('model', args.model)}")
    if usage:
        cost = usage.get("cost", "?")
        print(f"    cost: ${cost}  tokens={usage.get('total_tokens')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
