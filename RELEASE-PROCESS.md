# Hambry Engine Version Release Process

This document provides step-by-step instructions for releasing new versions of the Hambry Engine white-label software.

## Trigger Phrases

When the user says any of these phrases, read this file and follow the release process:
- "Prepare version release"
- "Release version X.X.X"
- "Read the release process"
- "Create new version"

## Overview

The Hambry Engine uses **semantic versioning** (MAJOR.MINOR.PATCH):
- **MAJOR** (X.0.0): Breaking changes that require client migration
- **MINOR** (0.X.0): New features, backward-compatible
- **PATCH** (0.0.X): Bug fixes, backward-compatible

Version history is maintained in `server/version-manager.ts`.

## Release Workflow

### Step 1: Read Version History

Read `/home/ubuntu/satire-news/server/version-manager.ts` to:
- Check the current `CURRENT_VERSION` constant (line ~27)
- Review the `VERSION_HISTORY` array (lines ~29-77)
- Understand what was included in the last release

### Step 2: Gather Changes

Collect all changes since the last release by:
1. Reading `/home/ubuntu/satire-news/todo.md` for completed items marked `[x]`
2. Reviewing recent checkpoint descriptions
3. Checking git commit messages (if available)
4. Asking the user if anything is missing

### Step 3: Determine Version Number

Based on the changes:
- **Breaking changes?** → Increment MAJOR (e.g., 1.2.0 → 2.0.0)
- **New features?** → Increment MINOR (e.g., 1.2.0 → 1.3.0)
- **Bug fixes only?** → Increment PATCH (e.g., 1.2.0 → 1.2.1)

Confirm the version number with the user before proceeding.

### Step 4: Write Changelog

Create a concise changelog array with:
- One line per major change
- Focus on user-facing features and fixes
- Use present tense, active voice
- Group related changes together
- Maximum 10-15 items (combine minor fixes)

**Good changelog entries:**
- "Latest page with category/date filters and infinite scroll"
- "Admin feed widget mobile responsiveness improvements"
- "SEO title length optimization (30-60 characters)"

**Bad changelog entries:**
- "Fixed a bug" (too vague)
- "Updated Latest.tsx to use proper data mapping and added filters" (too technical)
- "Made some changes to the homepage" (not specific)

### Step 5: Update version-manager.ts

Edit `/home/ubuntu/satire-news/server/version-manager.ts`:

1. Update `CURRENT_VERSION` constant:
   ```typescript
   const CURRENT_VERSION = "1.3.0"; // Change from previous version
   ```

2. Add new entry to `VERSION_HISTORY` array (before the closing `]`):
   ```typescript
   {
     version: "1.3.0",
     releaseDate: new Date("2026-02-26"), // Today's date
     changelog: [
       "Feature 1 description",
       "Feature 2 description",
       "Bug fix description",
     ],
     breaking: false, // Set to true if breaking changes
   },
   ```

### Step 6: Update todo.md

Mark the release task as complete in `/home/ubuntu/satire-news/todo.md`:
```markdown
- [x] Release version 1.3.0
```

### Step 7: Run Tests

Execute the test suite to ensure nothing is broken:
```bash
cd /home/ubuntu/satire-news && pnpm test
```

All tests must pass before proceeding.

### Step 8: Create Checkpoint

Save a checkpoint with the description:
```
Released Hambry Engine v1.3.0: [brief summary of key changes]
```

Use `webdev_save_checkpoint` tool.

### Step 9: Push to SaaS Repo

Push the release to the white-label SaaS distribution repository:

```bash
cd /home/ubuntu/satire-news
git tag -a vX.X.X -m "Hambry Engine vX.X.X"
git push github main --tags
```

**Important:** The `github` remote points to `pinbot9000-beep/satire-news-saas.git`. The Manus GitHub App does NOT have access to this repo — you need a Personal Access Token (PAT) with Contents read/write permission on `satire-news-saas`. If the push fails with "Repository not found" or "Write access not granted," ask the user to generate a new PAT at https://github.com/settings/tokens?type=beta with:
- Repository access: `satire-news-saas`
- Permissions > Contents: Read and write

Then update the remote: `git remote set-url github https://x-access-token:<PAT>@github.com/pinbot9000-beep/satire-news-saas.git`

### Step 10: Write Upgrade Guide

Create `UPGRADE-vX.X.X.md` in the project root with:
1. Overview of what's new
2. Two upgrade methods: Automated Script (scripts/upgrade.sh) and Manual Cherry-Pick
3. Explicit list of which engine-core files to copy (for cherry-pick method)
4. Any required patches to client-customizable files (documented as before/after snippets)
5. Database changes and new settings keys
6. Post-upgrade verification checklist
7. Rollback instructions

Refer to `CUSTOMIZABLE_FILES.md` for the file classification. Never include client-customizable files in the engine-core copy list.

### Step 11: Inform User

Provide the user with:
1. The checkpoint attachment (`manus-webdev://[version_id]`)
2. A summary of what's included in the release
3. Confirmation that the SaaS repo has been updated
4. Reminder to publish via the Management UI
5. The changelog for their reference
6. A short upgrade prompt they can give to another Manus system for client upgrades

## Example Release Message

```markdown
Released Hambry Engine v1.3.0 with mobile optimizations, Latest page, and RSS feed improvements. Key changes:

**New Features:**
- Latest page with category/date filters and Load More button
- Homepage initial article count admin setting
- "Check & Reactivate" feature for disabled RSS feeds
- 30 new RSS feeds for category balancing

**Improvements:**
- Mobile homepage white space fix
- SEO title length optimization
- Admin feed widget mobile responsiveness
- Source attribution redesigned (date-based)

All 365 tests pass. To deploy to production, click Publish in the Management UI.
```

## Important Notes

### Breaking Changes

If the release contains breaking changes (`breaking: true`):
- Increment MAJOR version
- Clearly document migration steps in the changelog
- Warn the user about the breaking changes
- Consider creating a migration guide

### Version Numbering Rules

- Always use semantic versioning (X.Y.Z)
- Never skip version numbers
- Release dates use ISO format: `new Date("YYYY-MM-DD")`
- Keep changelog entries concise and user-focused

### Files to Update

Files modified for every version release:
1. `server/version-manager.ts` (CURRENT_VERSION and VERSION_HISTORY)
2. `todo.md` (mark release task as complete)
3. `UPGRADE-vX.X.X.md` (new file — white-label upgrade guide for this version)

Do NOT modify:
- `package.json` version (not used for engine versioning)
- `DEPLOYMENT.md` (only for client deployment process)
- `CUSTOMIZABLE_FILES.md` (only update if file classification changes)
- `PROJECT-CONTEXT.md` (update only if architecture or key systems change)

### White-Label File Separation

Every release must respect the engine-core vs. client-customizable file separation documented in `CUSTOMIZABLE_FILES.md`. The upgrade guide must:
- Only list engine-core files in the copy/overwrite instructions
- Document any required changes to client-customizable files as manual patches
- Include the automated upgrade script (scripts/upgrade.sh) which handles backup/restore automatically

### SaaS Distribution

- **Main dev repo:** https://github.com/pinbot9000-beep/satire-news.git (auto-synced via Manus)
- **SaaS distribution repo:** https://github.com/pinbot9000-beep/satire-news-saas.git (push manually each release)
- Both repos should have matching tags for each release
- The SaaS repo requires a PAT to push (see Step 9)

**Current white-label clients and their repo source:**

| Client | Pulls from | Notes |
|---|---|---|
| Wilder Blueprint | `pinbot9000-beep/satire-news-saas` | Self-hosted, equity arrangement, self-service upgrades |
| RaceHub | `pinbot9000-beep/satire-news-saas` | Manus-hosted, separate project, v3.1.0 base |

Clients should always pull from a specific version tag (e.g., `git checkout v3.1.0`), not `main`, to avoid pulling in-progress work.

**Automated push script:** `scripts/push-saas-release.sh` handles adding the saas remote, force-pushing main, and tagging. Run it from the satire-news project root with a valid `GH_TOKEN` that has access to `satire-news-saas`.

### Testing Checklist

Before creating the final checkpoint:
- [ ] All tests pass (`pnpm test`)
- [ ] Dev server runs without errors
- [ ] Version number is correct in version-manager.ts
- [ ] Changelog is complete and accurate
- [ ] Release date is today's date
- [ ] Breaking changes flag is set correctly

## Troubleshooting

**Issue: Can't remember what changed since last release**
- Read `todo.md` for completed items
- Check recent checkpoint descriptions
- Ask the user to summarize changes

**Issue: Not sure if changes are breaking**
- Ask the user if existing white-label clients need to change anything
- If database schema changed → likely breaking
- If new features are optional → not breaking
- If bug fixes only → not breaking

**Issue: Changelog is too long**
- Combine related items
- Focus on user-facing changes
- Omit internal refactoring
- Maximum 10-15 items

## Quick Reference

**Key Files:**
- Version history: `/home/ubuntu/satire-news/server/version-manager.ts`
- Todo list: `/home/ubuntu/satire-news/todo.md`
- Deployment guide: `/home/ubuntu/satire-news/DEPLOYMENT.md`

**Key Commands:**
- Run tests: `cd /home/ubuntu/satire-news && pnpm test`
- Check version: `tsx server/version-manager.ts status`

**Semantic Versioning:**
- MAJOR.MINOR.PATCH
- Breaking changes → MAJOR
- New features → MINOR
- Bug fixes → PATCH
