#!/usr/bin/env bash
# Generate the full inspr.at image series via Nano Banana Pro.
# Saves each as web/src/assets/<name>.{jpg|png}.
# Run: source /tmp/.inspr-or.env && export OPENROUTER_API_KEY && bash web/scripts/gen-all-images.sh
set -uo pipefail

cd "$(dirname "$0")/../.."

MODEL="google/gemini-3-pro-image-preview"
ASSETS="web/src/assets"
PROMPTS="/tmp/inspr-prompts"

mkdir -p "$ASSETS"

names=(mission pluralism contract artifacts audience footer)

total_cost=0
fail=0

for name in "${names[@]}"; do
  prompt_file="$PROMPTS/$name.txt"
  out_file="$ASSETS/$name.png"   # script auto-corrects to .jpg if mime is JPEG
  if [ ! -f "$prompt_file" ]; then
    echo "MISS: prompt $prompt_file not found" >&2
    fail=$((fail+1))
    continue
  fi
  echo "==> generating: $name"
  if python3 web/scripts/gen-image.py \
      --model "$MODEL" \
      --out "$out_file" \
      --prompt-file "$prompt_file" \
      --retries 2; then
    echo "    done."
  else
    echo "    FAILED" >&2
    fail=$((fail+1))
  fi
  echo
done

echo "Done. Files in $ASSETS:"
ls -la "$ASSETS"
exit $fail
