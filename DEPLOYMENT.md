# Hambry Engine Deployment Guide

This guide explains how to deploy the Hambry Engine as a white-label solution for clients.

## Overview

The Hambry Engine is a fully automated satirical news platform that can be licensed to clients with custom branding. Each client gets their own isolated deployment with:

- ✅ Custom branding (name, logo, colors, tagline)
- ✅ Automated content workflow (RSS → article generation → media creation → social distribution)
- ✅ Multi-provider media generation (images and videos)
- ✅ Social media auto-posting (FeedHive, Reddit)
- ✅ Admin dashboard and optimizer
- ✅ License key validation
- ✅ Version tracking and updates

## Business Model

**Pricing Options:**
- Setup: $3,000 - $5,000 one-time
- Monthly: $200 - $500/month
- Annual: $2,000 - $5,000/year

**License Tiers:**

| Tier | Articles/Month | Multi-User | Priority Support | API Access | Price Range |
|------|----------------|------------|------------------|------------|-------------|
| Starter | 100 | ❌ | ❌ | ❌ | $200-300/mo |
| Professional | 500 | ✅ | ✅ | ✅ | $300-500/mo |
| Enterprise | Unlimited | ✅ | ✅ | ✅ | Custom |

**BYOK Model:**
- Clients bring their own Manus account
- Clients pay for their own API costs (LLM, media generation, etc.)
- Clients provide their own social media credentials

## Deployment Methods

### Method 1: Manual Deployment (Recommended)

**Step 1: Clone the Repository**
```bash
git clone https://github.com/yourusername/hambry-engine.git client-name
cd client-name
```

**Step 2: Install Dependencies**
```bash
pnpm install
```

**Step 3: Run Setup Wizard**
```bash
pnpm deploy:setup
```

This interactive wizard will:
- Collect client information (name, tagline, colors, etc.)
- Generate customized `shared/siteConfig.ts`
- Save deployment info to `.deployment-info.json`
- Validate license key (if provided)

**Step 4: Configure Environment**

The client needs to set up their own Manus account and configure:
- Database connection
- OAuth credentials
- API keys for external services (Replicate, FeedHive, etc.)

**Step 5: Deploy to Manus**

Guide the client to:
1. Create a new Manus project
2. Upload the customized code
3. Configure secrets via `webdev_request_secrets`
4. Run database migrations: `pnpm db:push`
5. Save checkpoint and publish

### Method 2: GitHub Template (Future)

Create a private GitHub template repository and invite clients to use it.

**Advantages:**
- Easy updates via Git
- Version control for client customizations
- Collaborative development

**Setup:**
1. Create private template repo from Hambry Engine
2. Invite client as collaborator
3. Client creates new repo from template
4. Client runs setup wizard
5. Client deploys to their Manus account

### Method 3: Manus Project Template (If Supported)

If Manus supports project templates, package the engine as a template that clients can install directly.

## License Management

### Generating License Keys

Use the built-in license generator:

```bash
pnpm license:generate
```

This generates a sample license. To create a custom license, modify `server/licensing.ts`:

```typescript
import { generateLicenseKey, getLicenseInfo } from "./server/licensing";

const license = generateLicenseKey(
  "Client Name",
  "client@example.com",
  "clientdomain.com",
  "professional", // or "starter" or "enterprise"
  12 // validity in months (omit for lifetime)
);

console.log(getLicenseInfo(license));
console.log("\nLicense Key:");
console.log(license.key);
```

### Validating Licenses

Licenses are automatically validated during setup. To manually validate:

```typescript
import { validateLicenseKey, getLicenseInfo } from "./server/licensing";

const validation = validateLicenseKey("HAMBRY-PRO-...");
if (validation.valid && validation.license) {
  console.log("✅ Valid license!");
  console.log(getLicenseInfo(validation.license));
} else {
  console.log(`❌ Invalid: ${validation.error}`);
}
```

### License Features

Licenses control access to features:

```typescript
import { hasFeature } from "./server/licensing";

if (hasFeature(license, "apiAccess")) {
  // Enable API endpoints
}

if (license.features.maxArticlesPerMonth !== -1) {
  // Check article count limits
}
```

## Version Management

### Checking for Updates

```bash
pnpm deploy:version
```

Shows current version, latest version, and update status.

### Update Process

1. **Check for updates:**
   ```bash
   pnpm deploy:update-check
   ```

2. **Get update instructions:**
   ```bash
   tsx server/version-manager.ts instructions
   ```

3. **Apply updates:**
   ```bash
   # Backup data
   pnpm db:export
   
   # Pull latest code
   git pull origin main
   
   # Install dependencies
   pnpm install
   
   # Run migrations
   pnpm db:push
   
   # Test
   pnpm test
   pnpm dev
   
   # Deploy
   # Save checkpoint and publish in Manus UI
   ```

### Version History

The version history is maintained in `server/version-manager.ts`. When releasing new versions:

1. Update `CURRENT_VERSION` constant
2. Add new entry to `VERSION_HISTORY` array
3. Mark breaking changes with `breaking: true`
4. Document all changes in `changelog` array

## Client Onboarding Checklist

### Pre-Deployment
- [ ] Collect client requirements (branding, content focus, etc.)
- [ ] Generate license key
- [ ] Set up client's Manus account
- [ ] Configure external service accounts (Replicate, FeedHive, Reddit)

### Deployment
- [ ] Clone repository
- [ ] Run setup wizard
- [ ] Customize branding in `shared/siteConfig.ts`
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Test locally
- [ ] Deploy to Manus
- [ ] Configure custom domain (if applicable)

### Post-Deployment
- [ ] Verify automated workflow runs correctly
- [ ] Test article generation
- [ ] Test media generation (images and videos)
- [ ] Test social media posting
- [ ] Train client on admin dashboard
- [ ] Provide support documentation
- [ ] Schedule follow-up check-in

## Configuration Files

### `shared/siteConfig.ts`
Central configuration file containing all branding and settings:
- Site name, tagline, description
- Colors and styling
- Contact information
- Content settings (genre, tone, categories)
- Legal information
- SEO settings

### `.deployment-info.json`
Deployment metadata (auto-generated by setup wizard):
- Engine version
- Client name and domain
- Deployment date
- License key

### Environment Variables
Required secrets (set via Manus UI):
- `DATABASE_URL` - Database connection
- `JWT_SECRET` - Session signing
- `VITE_APP_ID` - OAuth app ID
- `REPLICATE_API_KEY` - For video/image generation
- `FEEDHIVE_TRIGGER_URL` - For social posting
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` - For Reddit posting

## Customization Guide

### Branding
All branding is centralized in `shared/siteConfig.ts`:

```typescript
export const siteConfig = {
  name: "YourSite",
  tagline: "Your Tagline",
  description: "Your description",
  colors: {
    primary: "#your-color",
    // ...
  },
  // ...
};
```

### Content Settings
Configure content generation behavior:

```typescript
content: {
  genre: "technology", // or "politics", "business", etc.
  tone: "witty", // or "absurd", "dry", etc.
  categories: ["Tech", "AI", "Startups"],
  defaultCategory: "Tech",
}
```

### RSS Feeds
Add custom RSS feeds in the admin dashboard:
- Navigate to Admin → Optimizer → RSS Feeds
- Add feed URLs for content sources
- Configure refresh intervals

### Social Media
Configure platforms in admin dashboard:
- Navigate to Admin → Optimizer → Social Distribution
- Enable/disable platforms
- Configure credentials
- Customize post templates

## Support and Maintenance

### Client Support
- Provide documentation for admin dashboard
- Train on workflow configuration
- Explain content approval process
- Guide on social media setup

### Ongoing Maintenance
- Monitor for updates
- Apply security patches
- Assist with scaling (if needed)
- Help optimize content generation

### Troubleshooting

**Issue: Articles not generating**
- Check RSS feed URLs are valid
- Verify workflow settings in admin
- Check API key configuration
- Review logs in `.manus-logs/`

**Issue: Media generation failing**
- Verify provider API keys
- Check provider rate limits
- Review error logs
- Try alternative providers

**Issue: Social posting not working**
- Verify FeedHive/Reddit credentials
- Check post approval settings
- Review social media logs
- Test with manual post first

## Security Considerations

### License Keys
- Store license secret in environment variable: `HAMBRY_LICENSE_SECRET`
- Never commit license keys to version control
- Rotate secrets periodically

### API Keys
- All API keys should be stored as Manus secrets
- Never hardcode credentials
- Use BYOK model - clients provide their own keys

### Database
- Enable SSL for database connections
- Regular backups via Manus UI
- Restrict database access to application only

## Pricing Calculator

**Estimated Monthly Costs (per client):**

| Component | Cost Range |
|-----------|------------|
| Manus Hosting | $0-50 |
| LLM API (articles) | $20-100 |
| Image Generation | $10-50 |
| Video Generation | $50-200 |
| Social Media API | $0-20 |
| **Total Infrastructure** | **$80-420/mo** |

**Your Pricing:**
- Starter: $200-300/mo (covers costs + small margin)
- Professional: $300-500/mo (healthy margin)
- Enterprise: Custom (high-volume discounts)

## Next Steps

1. **Set up licensing system** - Generate license keys for clients
2. **Create deployment checklist** - Document step-by-step process
3. **Build client portal** (optional) - Self-service license management
4. **Automate updates** - Git-based update mechanism
5. **Create support documentation** - Help docs for clients

## Resources

- [Hambry Engine Documentation](./README.md)
- [API Reference](./API.md)
- [Admin Dashboard Guide](./ADMIN.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

## Contact

For licensing inquiries or technical support:
- Email: your-email@example.com
- Website: your-website.com
