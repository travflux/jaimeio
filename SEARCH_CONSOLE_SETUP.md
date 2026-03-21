# Google Search Console & Bing Webmaster Tools Setup

This document provides instructions for setting up and verifying your site with Google Search Console and Bing Webmaster Tools.

## Prerequisites

- Your site must be published and accessible at its public URL
- You need access to add files to the site or modify DNS records

## Google Search Console Setup

### Step 1: Create a Search Console Account

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account
3. Click "Add Property"

### Step 2: Choose Verification Method

**Option A: HTML File Upload (Recommended)**

1. Select "URL prefix" property type
2. Enter your site URL (e.g., `https://yourdomain.com`)
3. Choose "HTML file" verification method
4. Download the verification file (e.g., `google1234567890abcdef.html`)
5. Upload it to `client/public/` directory in your project
6. The file will be accessible at `https://yourdomain.com/google1234567890abcdef.html`
7. Click "Verify" in Search Console

**Option B: HTML Meta Tag**

1. Copy the meta tag provided by Google
2. Add it to `client/index.html` in the `<head>` section:
   ```html
   <meta name="google-site-verification" content="your-verification-code" />
   ```
3. Deploy your changes
4. Click "Verify" in Search Console

**Option C: DNS Record (For Custom Domains)**

1. Copy the TXT record provided by Google
2. Add it to your domain's DNS settings
3. Wait for DNS propagation (up to 48 hours)
4. Click "Verify" in Search Console

### Step 3: Submit Sitemap

1. After verification, go to "Sitemaps" in the left menu
2. Enter your sitemap URL: `https://yourdomain.com/sitemap.xml`
3. Click "Submit"
4. Google will start crawling and indexing your pages

### Step 4: Monitor Performance

- **Coverage**: Check which pages are indexed
- **Performance**: See search queries, clicks, and impressions
- **Enhancements**: Monitor Core Web Vitals and mobile usability
- **URL Inspection**: Test individual URLs for indexing issues

## Bing Webmaster Tools Setup

### Step 1: Create a Webmaster Tools Account

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Sign in with Microsoft account
3. Click "Add a site"

### Step 2: Import from Google Search Console (Easiest)

1. Click "Import from Google Search Console"
2. Authorize Bing to access your Google Search Console data
3. Select your site and import settings
4. Verification and sitemap will be automatically configured

**OR Manual Verification:**

1. Enter your site URL
2. Choose verification method (similar to Google):
   - XML file upload to `client/public/`
   - Meta tag in `client/index.html`
   - DNS CNAME record
3. Complete verification
4. Submit sitemap: `https://yourdomain.com/sitemap.xml`

## Robots.txt Configuration

Your `robots.txt` file is already configured at `client/public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml
```

Make sure to update the Sitemap URL with your actual domain after deployment.

## Sitemap Features

Your dynamic sitemap (`/sitemap.xml`) automatically includes:

- All published articles with `lastmod` dates
- All categories
- Static pages (home, about, contact, etc.)
- Game pages (crossword, word scramble, trivia, mad libs)
- Info pages (privacy, terms, editorial standards)

The sitemap updates automatically when new articles are published.

## Monitoring and Maintenance

### Weekly Tasks

- Check Search Console for crawl errors
- Review new search queries and performance
- Monitor Core Web Vitals scores

### Monthly Tasks

- Analyze top-performing pages
- Identify pages with declining traffic
- Check for manual actions or security issues
- Review mobile usability reports

### When Publishing New Content

- Use URL Inspection tool to request immediate indexing
- Monitor "Coverage" report for newly published pages
- Check if new pages appear in search results within 24-48 hours

## Troubleshooting

### Pages Not Indexed

1. Use URL Inspection tool in Search Console
2. Check for `noindex` tags or robots.txt blocks
3. Verify canonical URLs are correct
4. Ensure pages are linked from other pages (internal linking)
5. Request indexing manually via URL Inspection tool

### Sitemap Errors

1. Verify sitemap is accessible: `https://yourdomain.com/sitemap.xml`
2. Check for XML syntax errors
3. Ensure all URLs in sitemap are accessible (200 status)
4. Verify sitemap follows [sitemaps.org protocol](https://www.sitemaps.org/protocol.html)

### Duplicate Content Issues

- Canonical URLs are implemented on all pages to prevent this
- Check Search Console for duplicate content warnings
- Ensure consistent URL structure (with/without trailing slashes)

## Additional Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmasters-guidelines-30fba23a)
- [Schema.org Documentation](https://schema.org/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)

## Notes

- Verification files in `client/public/` are automatically deployed
- Changes to meta tags require redeployment
- DNS changes can take up to 48 hours to propagate
- Initial indexing may take 1-7 days after verification
- Sitemap is automatically generated and doesn't require manual updates
