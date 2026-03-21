#!/bin/bash
# Hambry Engine — White-Label Safe Upgrade Script
# This script upgrades engine-core files only, preserving all client customizations.
#
# Usage: bash scripts/upgrade.sh v1.4.0
#
# What it does:
# 1. Backs up client-customizable files to a temp directory
# 2. Fetches the target version from the SaaS repo
# 3. Checks out the target version
# 4. Restores all client-customizable files from backup
# 5. Installs dependencies and runs migrations
# 6. Runs tests to verify

set -e

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "❌ Usage: bash scripts/upgrade.sh <version>"
  echo "   Example: bash scripts/upgrade.sh v1.4.0"
  exit 1
fi

echo "🔄 Hambry Engine Upgrade to $VERSION"
echo "================================================"

# Define client-customizable files that must be preserved
CLIENT_FILES=(
  "shared/siteConfig.ts"
  "shared/categoryColors.ts"
  "shared/categoryImages.ts"
  "client/index.html"
  "client/src/index.css"
  "client/src/pages/Home.tsx"
  "client/src/pages/ArticlePage.tsx"
  "client/src/pages/CategoryPage.tsx"
  "client/src/pages/AboutPage.tsx"
  "client/src/pages/ContactPage.tsx"
  "client/src/pages/CareersPage.tsx"
  "client/src/pages/AdvertisePage.tsx"
  "client/src/pages/EditorialStandardsPage.tsx"
  "client/src/pages/PrivacyTermsPage.tsx"
  "client/src/pages/NotFound.tsx"
  "client/src/App.tsx"
  "client/src/components/Navbar.tsx"
  "client/src/components/Footer.tsx"
  "client/src/components/BreakingNewsTicker.tsx"
  "client/src/components/LoadingScreen.tsx"
  "client/src/components/NewsletterBanner.tsx"
  "client/src/contexts/ThemeContext.tsx"
  "client/src/main.tsx"
  "client/src/const.ts"
)

CLIENT_DIRS=(
  "client/public"
)

BACKUP_DIR=".upgrade-backup-$(date +%Y%m%d%H%M%S)"

# Step 1: Backup client files
echo ""
echo "📦 Step 1: Backing up client-customizable files..."
mkdir -p "$BACKUP_DIR"

for file in "${CLIENT_FILES[@]}"; do
  if [ -f "$file" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp "$file" "$BACKUP_DIR/$file"
    echo "   ✅ Backed up: $file"
  fi
done

for dir in "${CLIENT_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$dir")"
    cp -r "$dir" "$BACKUP_DIR/$dir"
    echo "   ✅ Backed up: $dir/"
  fi
done

echo "   Backup saved to: $BACKUP_DIR/"

# Step 2: Fetch and checkout target version
echo ""
echo "📥 Step 2: Fetching $VERSION from remote..."
git fetch origin --tags
git checkout "$VERSION"
echo "   ✅ Checked out $VERSION"

# Step 3: Restore client files
echo ""
echo "🔁 Step 3: Restoring client-customizable files..."

for file in "${CLIENT_FILES[@]}"; do
  if [ -f "$BACKUP_DIR/$file" ]; then
    mkdir -p "$(dirname "$file")"
    cp "$BACKUP_DIR/$file" "$file"
    echo "   ✅ Restored: $file"
  fi
done

for dir in "${CLIENT_DIRS[@]}"; do
  if [ -d "$BACKUP_DIR/$dir" ]; then
    rm -rf "$dir"
    cp -r "$BACKUP_DIR/$dir" "$dir"
    echo "   ✅ Restored: $dir/"
  fi
done

# Step 4: Install dependencies
echo ""
echo "📦 Step 4: Installing dependencies..."
pnpm install
echo "   ✅ Dependencies installed"

# Step 5: Run database migrations
echo ""
echo "🗄️  Step 5: Running database migrations..."
pnpm db:push
echo "   ✅ Migrations applied"

# Step 6: Run tests
echo ""
echo "🧪 Step 6: Running test suite..."
if pnpm test; then
  echo "   ✅ All tests passed"
else
  echo "   ❌ Some tests failed. Review output above."
  echo "   To rollback: git checkout <previous-version> && bash scripts/upgrade.sh <previous-version>"
  exit 1
fi

echo ""
echo "================================================"
echo "✅ Upgrade to $VERSION complete!"
echo ""
echo "Next steps:"
echo "  1. Start the dev server: pnpm dev"
echo "  2. Verify all schedulers initialize in the logs"
echo "  3. Check the admin dashboard and public site"
echo "  4. If deployed on Manus: save checkpoint and publish"
echo ""
echo "Backup preserved at: $BACKUP_DIR/"
echo "To clean up after verifying: rm -rf $BACKUP_DIR"
