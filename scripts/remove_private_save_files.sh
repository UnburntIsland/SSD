#!/usr/bin/env bash
set -euo pipefail

# Run from repo root. This removes generated private save files from the working tree
# and untracks already-committed matching files from the next commit.

patterns=(
  'private-rukai-millet-saves-*.json'
  'rukai-millet-saves-*.json'
  '*.save.json'
  '*save*.json'
  '*saves*.json'
  'storageState.json'
  '*.storageState.json'
)

# Delete matching files in the working tree, but never touch .git.
find . -type f \( \
  -name 'private-rukai-millet-saves-*.json' -o \
  -name 'rukai-millet-saves-*.json' -o \
  -name '*.save.json' -o \
  -name '*save*.json' -o \
  -name '*saves*.json' -o \
  -name 'storageState.json' -o \
  -name '*.storageState.json' \
\) -not -path './.git/*' -print -delete

# Untrack matching files that are already in git.
while IFS= read -r -d '' tracked; do
  case "$tracked" in
    *private-rukai-millet-saves-*.json|*rukai-millet-saves-*.json|*.save.json|*save*.json|*saves*.json|*storageState.json|*.storageState.json)
      git rm --cached --ignore-unmatch -- "$tracked" || true
      ;;
  esac
done < <(git ls-files -z)

# Untrack common folders that may contain browser state or downloads.
git rm -r --cached --ignore-unmatch downloads saves test-results playwright-report .playwright playwright/.auth || true

echo 'Private save files have been removed/untracked. Commit the changes next.'
