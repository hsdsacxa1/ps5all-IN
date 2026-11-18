#!/usr/bin/env bash
set -euo pipefail

# One-shot GitHub Release publisher for TITAN-CORE Mod v2.3 (+ preserved Mod v2.2)
# Usage:
#   ./publish-github-release.sh <owner/repo> [tag] [--draft]
# Example:
#   ./publish-github-release.sh myuser/TITAN-CORE-Mod v1.0.3-mod-20261118

REPO="${1:-}"
TAG="${2:-v1.0.3-mod-20261118}"
DRAFT_FLAG="${3:-}"

if [[ -z "$REPO" || "$REPO" != */* ]]; then
  echo "Usage: $0 <owner/repo> [tag] [--draft]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> [1/4] Verifying SHA-256 checksums for local artifacts..."
if [[ -f SHA256SUMS ]]; then
  sha256sum -c SHA256SUMS --ignore-missing
fi

echo "==> [2/4] Preparing Git source tree from TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz..."
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

tar -xzf TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz -C "$WORK_DIR"
SRC_DIR="$(find "$WORK_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)"

pushd "$SRC_DIR" >/dev/null
git init -b main
git add -A
git commit -m "TITAN-CORE Mod v2.3 (${TAG}): Google Drive Telemetry + grimmtroll/TITAN FIX7 Port"
git remote add origin "https://github.com/${REPO}.git"
git tag -f "$TAG" -m "TITAN-CORE Mod v2.3 (${TAG})"

echo "==> [3/4] Pushing branch 'main' and tag '${TAG}' to github.com/${REPO}..."
echo "    (Tag push triggers .github/workflows/build.yml to compile the PS5 ELF64 via Docker)"
git push -u origin main --force-with-lease || git push -u origin main
git push origin "refs/tags/${TAG}" --force
popd >/dev/null

echo "==> [4/4] Creating / updating GitHub Release '${TAG}' with source, patch & preserved v2.2 assets..."
if command -v gh >/dev/null 2>&1; then
  ASSETS=(
    "TITAN-CORE-v1.0.3-mod-20261118-src.tar.gz"
    "TITAN-CORE-v1.0-mod-20261118-v2.3.patch"
    "TITAN-CORE-v1.0-mod-20261118-v2.3.elf.txt"
    "TITAN-CORE-v1.0.2-mod-20261118-src.tar.gz"
    "TITAN-CORE-v1.0-mod-20261118-v2.2.patch"
    "TITAN-CORE-v1.0-mod-20261118-v2.2.elf.txt"
    "TITAN-CORE-README.md"
    "SHA256SUMS"
  )

  # Include locally compiled .elf binaries if present alongside this script
  for elf in "TITAN-CORE-v1.0-mod-20261118-v2.3.elf" "TITAN-CORE-v1.0-mod-20261118-v2.2.elf"; do
    if [[ -f "$elf" ]]; then
      ASSETS+=("$elf")
    fi
  done

  if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
    gh release upload "$TAG" "${ASSETS[@]}" --repo "$REPO" --clobber
  else
    gh release create "$TAG" "${ASSETS[@]}" \
      --repo "$REPO" \
      --title "TITAN-CORE v1.0.3 Mod v2.3 (Google Drive Telemetry + grimmtroll/TITAN FIX7 Port + Preserved v2.2)" \
      --notes-file RELEASE-v1.0.3-mod-v2.3.md \
      ${DRAFT_FLAG}
  fi

  echo "Done! Release published at: https://github.com/${REPO}/releases/tag/${TAG}"
  echo "GitHub Actions will automatically compile and attach TITAN-CORE-v1.0-mod-20261118-v2.3.elf."
else
  echo "gh CLI not found. Tag '${TAG}' has been pushed; GitHub Actions will create the release automatically."
  echo "Track workflow progress at: https://github.com/${REPO}/actions"
fi
