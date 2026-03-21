#!/bin/bash

# push-saas-release.sh — Full mirror sync from satire-news to satire-news-saas
#
# This script creates an EXACT COPY of the current satire-news codebase
# in the satire-news-saas repo. No partial syncs. No missed files.
# The SaaS repo is always a complete mirror at the moment of release.
#
# Usage:
#   ./scripts/push-saas-release.sh 4.3.0
#   ./scripts/push-saas-release.sh 4.3.0 "White-label pollution fix, real image sourcing"
#
# Requires: SAAS_GITHUB_PAT env var (set in Manus Secrets panel)

set -e

VERSION=$1
DESCRIPTION=${2:-"Engine release v$VERSION"}

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/push-saas-release.sh <version> [description]"
  echo "Example: ./scripts/push-saas-release.sh 4.3.0 'White-label cleanup'"
  exit 1
fi

# ── Config ─────────────────────────────────────────────────

ENGINE_REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"  # satire-news root
SAAS_REPO_DIR="/tmp/satire-news-saas-release"         # temp clone dir
PAT="${SAAS_GITHUB_PAT}"
SAAS_REMOTE="https://x-access-token:${PAT}@github.com/pinbot9000-beep/satire-news-saas.git"

if [ -z "$PAT" ]; then
  echo "ERROR: SAAS_GITHUB_PAT is not set. Add it via the Manus Secrets panel."
  exit 1
fi

echo "╔══════════════════════════════════════════════════╗"
echo "║  SAAS RELEASE — Full Mirror Sync                ║"
echo "║  Version: v$VERSION"
echo "║  Source:  $ENGINE_REPO_DIR"
echo "║  Target:  satire-news-saas (via HTTPS PAT)"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Verify engine repo is clean ────────────────────

echo "Step 1: Checking engine repo status..."
cd "$ENGINE_REPO_DIR"
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Engine repo has uncommitted changes. Commit or stash first."
  exit 1
fi
ENGINE_COMMIT=$(git rev-parse --short HEAD)
echo "  Engine at commit: $ENGINE_COMMIT"
echo ""

# ── Step 2: Run unit tests before pushing ──────────────────

echo "Step 2: Running unit tests..."
cd "$ENGINE_REPO_DIR"
pnpm test 2>&1 | tail -8
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "ERROR: Unit tests failed. Fix before pushing to SaaS."
  exit 1
fi
echo "  Unit tests passed."
echo ""

# ── Step 3: Clone or update SaaS repo ─────────────────────

echo "Step 3: Preparing SaaS repo..."
if [ -d "$SAAS_REPO_DIR" ]; then
  echo "  Removing stale temp clone..."
  rm -rf "$SAAS_REPO_DIR"
fi
echo "  Cloning satire-news-saas to temp dir..."
git clone "$SAAS_REMOTE" "$SAAS_REPO_DIR"
echo ""

# ── Step 4: FULL MIRROR SYNC ──────────────────────────────
#
# Delete everything in the SaaS repo (except .git) and copy
# everything from the engine repo. No partial sync. No missed files.

echo "Step 4: Full mirror sync..."
cd "$SAAS_REPO_DIR"

# Delete everything except .git directory
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +

# Copy everything from engine repo except .git, node_modules, and build artifacts
# Use rsync if available, otherwise fall back to Python shutil (mirror-sync.py)
if command -v rsync &>/dev/null; then
  echo "  Using rsync..."
  rsync -a \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.production' \
    --exclude='*.log' \
    --exclude='.manus-logs' \
    "$ENGINE_REPO_DIR/" "$SAAS_REPO_DIR/"
else
  echo "  rsync not found — using Python fallback (mirror-sync.py)..."
  MIRROR_SCRIPT="$ENGINE_REPO_DIR/scripts/mirror-sync.py"
  if [ ! -f "$MIRROR_SCRIPT" ]; then
    echo "ERROR: Neither rsync nor scripts/mirror-sync.py found. Cannot sync."
    exit 1
  fi
  # mirror-sync.py reads ENGINE_REPO_DIR and SAAS_REPO_DIR from env
  ENGINE_REPO_DIR="$ENGINE_REPO_DIR" SAAS_REPO_DIR="$SAAS_REPO_DIR" python3 "$MIRROR_SCRIPT"
fi

echo "  Mirror sync complete."
echo ""

# ── Step 5: Verify critical files exist ───────────────────

echo "Step 5: Verifying critical files..."
MISSING=0

check_file() {
  if [ ! -f "$SAAS_REPO_DIR/$1" ]; then
    echo "  MISSING: $1"
    MISSING=1
  else
    echo "  OK: $1"
  fi
}

check_file "server/sources/real-image-sourcing.ts"
check_file "server/sources/rss-bridge.ts"
check_file "server/sources/x-listener.ts"
check_file "server/sources/reddit-listener.ts"
check_file "server/sources/google-news.ts"
check_file "server/sources/manual-injection.ts"
check_file "server/sources/web-scraper.ts"
check_file "server/sources/youtube-agent.ts"
check_file "server/tagging.ts"
check_file "server/search.ts"
check_file "server/workflow.ts"
check_file "client/src/components/SetupWizard.tsx"
check_file "client/src/pages/ArchivePage.tsx"
check_file "client/src/pages/TagPage.tsx"
check_file "drizzle/schema.ts"
check_file "tests/e2e/homepage.spec.ts"
check_file "tests/e2e/white-label.spec.ts"
check_file "CHANGELOG.md"
check_file "RELEASE-PROCESS.md"

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "ERROR: Critical files missing after sync. Aborting."
  exit 1
fi
echo ""

# ── Step 6: Verify no Hambry pollution in seed defaults ───

echo "Step 6: Checking for Hambry pollution in seed defaults..."
POLLUTION=$(grep -n '"Hambry"\|"The News, Remastered"\|"hambry\.com"' "$SAAS_REPO_DIR/server/db.ts" | grep -v "//\|/\*\|comment\|fallback.*SITE_URL" | head -5 || true)
if [ -n "$POLLUTION" ]; then
  echo "  WARNING: Possible Hambry-specific values in DEFAULT_SETTINGS:"
  echo "  $POLLUTION"
  echo "  Review these before proceeding."
  read -p "  Continue anyway? (y/N): " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    echo "  Aborting."
    exit 1
  fi
else
  echo "  No Hambry pollution detected in seed defaults."
fi
echo ""

# ── Step 7: Commit and tag ────────────────────────────────

echo "Step 7: Committing and tagging..."
cd "$SAAS_REPO_DIR"
git config user.email "engine@satire-news.build"
git config user.name "Satire Engine Release Bot"
git add -A

# Check if there are changes to commit
if [ -z "$(git status --porcelain)" ]; then
  echo "  No changes detected — SaaS repo already matches engine."
  echo "  Tagging only."
else
  git commit -m "v$VERSION — $DESCRIPTION

Full mirror sync from satire-news @ $ENGINE_COMMIT
Unit tests: passing"
fi

# Tag (delete existing tag if it exists)
git tag -d "v$VERSION" 2>/dev/null || true
git tag "v$VERSION"
echo ""

# ── Step 8: Push ──────────────────────────────────────────

echo "Step 8: Pushing to origin..."
git push origin main
git push origin "v$VERSION" --force

# Always update the 'latest' tag to point to this release
git tag -f latest
git push origin latest --force

# Push all tags (ensures no version tags are missing on remote)
git push origin --tags
echo ""

# ── Step 9: Clean up temp dir ─────────────────────────────

echo "Step 9: Cleaning up temp dir..."
rm -rf "$SAAS_REPO_DIR"
echo "  Done."
echo ""

# ── Done ──────────────────────────────────────────────────

FINAL_COMMIT=$(cd "$ENGINE_REPO_DIR" && git rev-parse --short HEAD)
echo "╔══════════════════════════════════════════════════╗"
echo "║  SAAS RELEASE COMPLETE                          ║"
echo "║                                                  ║"
echo "║  Version:  v$VERSION                            ║"
echo "║  Engine:   $FINAL_COMMIT                        ║"
echo "║  Tag:      v$VERSION                            ║"
echo "║                                                  ║"
echo "║  White-label clients can now pull:               ║"
echo "║  git pull origin main                            ║"
echo "║  git checkout v$VERSION                         ║"
echo "╚══════════════════════════════════════════════════╝"
