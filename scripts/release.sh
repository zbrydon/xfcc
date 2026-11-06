#!/usr/bin/env bash
# Creates the GitHub release and tag for the version on origin/main, once it is
# approved on npm. A `v*` tag cannot be removed, so any failure stops before `gh`.
set -euo pipefail

cd "$(dirname "$0")/.."

git fetch --quiet origin main
version="$(git show origin/main:package.json | node -p 'JSON.parse(require("fs").readFileSync(0)).version')"

if git ls-remote --exit-code origin "refs/tags/v$version" > /dev/null; then
  echo "v$version already exists" >&2
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
