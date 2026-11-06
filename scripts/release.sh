#!/usr/bin/env bash
# Creates the GitHub release and tag for a version once it is approved on npm.
# Usage: scripts/release.sh [version], defaulting to the version on origin/main.
# A `v*` tag cannot be removed, so any failure stops before `gh`.
set -euo pipefail

cd "$(dirname "$0")/.."

git fetch --quiet origin main
version="${1:-$(git show origin/main:package.json | node -p 'JSON.parse(require("fs").readFileSync(0)).version')}"

# Exit 2 means no such tag. 0 means it exists, anything else is a failed check.
status=0
git ls-remote --exit-code origin "refs/tags/v$version" > /dev/null || status=$?
if [ "$status" -ne 2 ]; then
  echo "v$version already exists, or the check failed (exit $status)" >&2
  exit 1
fi

pnpm view "xfcc-parser@$version" version > /dev/null

# The commit that added the version's heading: main may have moved on since.
sha="$(git log -1 --format=%H -G"^## $version\$" origin/main -- CHANGELOG.md)"
: "${sha:?no commit adds a CHANGELOG.md heading for $version}"

# awk reads all its input: exiting early kills `git show` with SIGPIPE on a large
# file, which pipefail turns into a silent abort.
notes="$(git show "$sha:CHANGELOG.md" | awk -v v="$version" '/^## /{f=$2==v;next}f')"
: "${notes:?no CHANGELOG.md section for $version}"

gh release create "v$version" --target "$sha" --title "v$version" --notes "$notes"
