#!/usr/bin/env bash
# Fuzzes the built package. Usage: run.sh <target> [libFuzzer options]
set -euo pipefail

target="$1"
shift

cd "$(dirname "$0")/.."
pnpm exec tsdown
cd fuzz
pnpm install --frozen-lockfile

mkdir -p "corpus/$target" artifacts
corpora=("corpus/$target")
if [ -d "seeds/$target" ]; then
  corpora+=("seeds/$target")
fi
exec pnpm exec jazzer "targets/$target.fuzz.mjs" "${corpora[@]}" \
  --sync --includes dist/ -- -artifact_prefix=artifacts/ "$@"
