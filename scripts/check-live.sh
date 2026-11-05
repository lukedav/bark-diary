#!/usr/bin/env bash
# Usage: scripts/check-live.sh https://bark-diary.vercel.app
# Fails if the deployed site is not indexable or the SEO files are missing.
set -euo pipefail
origin="${1:?origin required, e.g. https://bark-diary.vercel.app}"
fail=0
check() { # label, condition-command...
  local label="$1"; shift
  if "$@"; then echo "ok   $label"; else echo "FAIL $label"; fail=1; fi
}
home="$(curl -fsSL "$origin/")"
headers="$(curl -fsSI "$origin/")"
check "home page returns 200"      test -n "$home"
check "no noindex meta"            bash -c '! grep -qi "noindex" <<<"$1"' _ "$home"
check "no X-Robots-Tag header"     bash -c '! grep -qi "x-robots-tag" <<<"$1"' _ "$headers"
check "title has brand phrase"     grep -q "<title>Coffs Bark Diary" <<<"$home"
check "canonical matches origin"   grep -q "rel=\"canonical\" href=\"$origin/\"" <<<"$home"
check "robots.txt is served"       bash -c 'curl -fsSL "$1/robots.txt" | grep -q "^Sitemap: $1/sitemap.xml"' _ "$origin"
check "sitemap.xml is served"      bash -c 'curl -fsSL "$1/sitemap.xml" | grep -q "<loc>$1/</loc>"' _ "$origin"
check "csv is served"              bash -c 'curl -fsSL "$1/bark-diary.csv" | head -1 | grep -q "^Date,Start,End,Duration,Barks"' _ "$origin"
exit $fail
