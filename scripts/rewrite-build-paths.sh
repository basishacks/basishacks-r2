#!/usr/bin/env bash

set -euo pipefail

readonly SEARCH_ROOT="${1:-.output}"
readonly GITHUB_BUILD_ROOT="/home/runner/work/basishacks-r2/basishacks-r2"
readonly PRODUCTION_ROOT="/home/devleaderz/basishacks-r2"

if [[ ! -d "$SEARCH_ROOT" ]]; then
    echo "Build directory does not exist: $SEARCH_ROOT" >&2
    exit 1
fi

rewritten_files=0

while IFS= read -r -d "" file; do
    if LC_ALL=C grep -IqF -- "$GITHUB_BUILD_ROOT" "$file"; then
        LC_ALL=C OLD_PATH="$GITHUB_BUILD_ROOT" NEW_PATH="$PRODUCTION_ROOT" \
            perl -0pi -e 's/\Q$ENV{OLD_PATH}\E/$ENV{NEW_PATH}/g' "$file"
        ((rewritten_files += 1))
    fi
done < <(find "$SEARCH_ROOT" -type f -print0)

if LC_ALL=C grep -rIqF -- "$GITHUB_BUILD_ROOT" "$SEARCH_ROOT"; then
    echo "Failed to replace every GitHub build path under $SEARCH_ROOT" >&2
    exit 1
fi

echo "Rewrote GitHub build paths in $rewritten_files file(s)."
