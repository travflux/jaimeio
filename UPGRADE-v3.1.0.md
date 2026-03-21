# Upgrade Guide: v3.0.1 → v3.1.0

This guide covers what white-label deployers need to do when upgrading from v3.0.1 to v3.1.0.

---

## What Changed

v3.1.0 is a **non-breaking feature release**. All existing data, settings, and configurations are preserved. No manual SQL migrations are required — the engine handles new settings automatically on first boot.

---

## Upgrade Steps

### 1. Pull the new code

```bash
git pull origin main
pnpm install
```

### 2. Restart the server

```bash
pnpm build
pnpm start
```

The engine will automatically seed any missing settings keys on startup. No manual DB work required.

### 3. Optional: Configure `brand_genre`

A new setting key `brand_genre` controls the genre label used in category meta descriptions (e.g., "news", "real estate content", "sports coverage"). It defaults to `"news"` if not set.

To configure it, go to **Admin → Settings → Branding** and set the Genre field, or insert directly:

```sql
INSERT INTO settings (key, value, category) VALUES ('brand_genre', 'your genre here', 'branding')
ON DUPLICATE KEY UPDATE value = 'your genre here';
```

### 4. Verify the publish gate

The new publish image gate means articles without a `featuredImage` AND without a `mascot_url` configured will stay in `approved` status and cannot be published. To ensure your pipeline isn't blocked:

- Either configure a `mascot_url` in **Admin → Settings → Branding** (recommended for white-label deployments without per-article images), or
- Ensure your article generation pipeline always produces a `featuredImage`

### 5. Submit `/content-sitemap.xml` to Google Search Console

The CEO dashboard now reads GSC index counts from `/content-sitemap.xml` specifically. If you haven't submitted this sitemap to GSC, do so now:

1. Go to Google Search Console → Sitemaps
2. Add `yourdomain.com/content-sitemap.xml`
3. Submit

---

## New Features Summary

| Feature | Where to configure |
|---|---|
| Goodies visibility toggles | Admin → Setup Wizard → Screen 9, or Admin → Settings → Goodies |
| Publish image gate | Automatic — configure mascot_url in Branding Settings to unblock |
| GSC content sitemap index count | CEO Dashboard §6 — requires sitemap submitted to GSC |
| Brand genre label | Admin → Settings → Branding → Genre field |

---

## Breaking Changes

None. v3.1.0 is fully backward compatible with v3.0.1 deployments.

---

## Rollback

If you need to roll back to v3.0.1:

```bash
git checkout v3.0.1
pnpm install
pnpm build
pnpm start
```

The new settings keys added in v3.1.0 (`brand_genre`, goodies keys) will simply be ignored by the older code. No data loss.
