#!/usr/bin/env tsx
/**
 * Satire Engine Deployment CLI
 * 
 * Automates client setup and branding customization for white-label deployments.
 * 
 * Usage:
 *   pnpm deploy:setup
 *   pnpm deploy:customize
 *   pnpm deploy:validate
 */

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

interface ClientConfig {
  siteName: string;
  tagline: string;
  description: string;
  email: string;
  twitter?: string;
  companyName: string;
  domain: string;
  primaryColor: string;
  genre: string;
  tone: string;
  licenseKey?: string;
}

async function collectClientInfo(): Promise<ClientConfig> {
  console.log("\n🚀 Satire Engine Deployment Wizard\n");
  console.log("Let's customize the engine for your client...\n");

  const siteName = await question("Site Name (e.g., 'TechSatire'): ");
  const tagline = await question("Tagline (e.g., 'Tech News, Reimagined'): ");
  const description = await question("Description (1 sentence): ");
  const email = await question("Contact Email: ");
  const twitter = await question("Twitter Handle (optional, @username): ");
  const companyName = await question("Company Name: ");
  const domain = await question("Custom Domain (e.g., techsatire.com): ");
  const primaryColor = await question("Primary Color (hex, e.g., #3b82f6): ");
  const genre = await question("Content Genre (satire/news/tech/entertainment): ");
  const tone = await question("Content Tone (satirical/professional/casual): ");

  return {
    siteName,
    tagline,
    description,
    email,
    twitter: twitter || undefined,
    companyName,
    domain,
    primaryColor,
    genre,
    tone,
  };
}

function generateSiteConfig(config: ClientConfig): string {
  return `/**
 * Site Configuration
 * 
 * This file contains all white-label configuration for the content engine.
 * Customized for: ${config.siteName}
 */

export interface SiteConfig {
  // Brand Identity
  siteName: string;
  tagline: string;
  description: string;
  
  // Visual Branding
  logo: {
    url: string;
    alt: string;
  };
  
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  
  // Contact & Social
  contact: {
    email: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  
  // Content Settings
  content: {
    genre: string;
    tone: string;
    defaultCategories: string[];
  };
  
  // SEO & Meta
  seo: {
    keywords: string[];
    ogImage: string;
    twitterCard: string;
  };
  
  // Legal
  legal: {
    companyName: string;
    foundedYear: number;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
  };
}

export const defaultSiteConfig: SiteConfig = {
  siteName: "${config.siteName}",
  tagline: "${config.tagline}",
  description: "${config.description}",
  
  logo: {
    url: "/logo.svg",
    alt: "${config.siteName} Logo"
  },
  
  colors: {
    primary: "${config.primaryColor}",
    secondary: "#1e40af",
    background: "#ffffff",
    text: "#0a0a0a"
  },
  
  contact: {
    email: "${config.email}",
    ${config.twitter ? `twitter: "${config.twitter}",` : ""}
  },
  
  content: {
    genre: "${config.genre}",
    tone: "${config.tone}",
    defaultCategories: [
      "Politics",
      "Business",
      "Technology",
      "Science",
      "Entertainment",
      "Sports",
      "World",
      "Lifestyle",
      "Opinion",
      "Art"
    ]
  },
  
  seo: {
    keywords: ["${config.genre}", "news", "${config.tone}", "current events"],
    ogImage: "/og-image.jpg",
    twitterCard: "summary_large_image"
  },
  
  legal: {
    companyName: "${config.companyName}",
    foundedYear: ${new Date().getFullYear()},
  }
};

export function getSiteConfig(): SiteConfig {
  return defaultSiteConfig;
}

export function getConfigValue<K extends keyof SiteConfig>(key: K): SiteConfig[K] {
  return getSiteConfig()[key];
}
`;
}

function updatePackageJson(siteName: string) {
  const packagePath = path.join(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
  
  pkg.name = siteName.toLowerCase().replace(/\s+/g, "-");
  pkg.description = `Content automation engine for ${siteName}`;
  
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
  console.log("✅ Updated package.json");
}

function createDeploymentChecklist(config: ClientConfig) {
  const checklist = `# ${config.siteName} Deployment Checklist

## Pre-Deployment
- [ ] Client has created Manus account
- [ ] License key validated
- [ ] Custom domain registered (${config.domain})
- [ ] Brand assets provided (logo, og-image)

## Configuration
- [x] Site branding customized
- [ ] RSS feed sources configured
- [ ] Social media credentials added
- [ ] Email notifications configured
- [ ] Analytics tracking ID added

## Content Setup
- [ ] Default categories reviewed
- [ ] Initial articles imported/generated
- [ ] Editorial standards page customized
- [ ] About page content written
- [ ] Contact/Advertise pages reviewed

## Technical
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] Custom domain DNS configured
- [ ] SSL certificate verified
- [ ] Workflow scheduler tested

## Launch
- [ ] Admin training completed
- [ ] Test workflow run successful
- [ ] First batch of articles published
- [ ] Social media accounts connected
- [ ] Go-live date: ___________

## Post-Launch
- [ ] Monitor first 24 hours
- [ ] Verify automated workflow runs
- [ ] Check social media posting
- [ ] Review analytics data
- [ ] Schedule 1-week check-in
`;

  fs.writeFileSync("DEPLOYMENT_CHECKLIST.md", checklist);
  console.log("✅ Created deployment checklist");
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "setup";

  if (command === "setup") {
    const config = await collectClientInfo();
    
    console.log("\n📝 Generating configuration files...\n");
    
    // Generate siteConfig.ts
    const configContent = generateSiteConfig(config);
    const configPath = path.join(process.cwd(), "shared", "siteConfig.ts");
    fs.writeFileSync(configPath, configContent);
    console.log("✅ Generated shared/siteConfig.ts");
    
    // Update package.json
    updatePackageJson(config.siteName);
    
    // Create deployment checklist
    createDeploymentChecklist(config);
    
    // Save config for reference
    fs.writeFileSync(
      ".client-config.json",
      JSON.stringify(config, null, 2)
    );
    console.log("✅ Saved client configuration");
    
    console.log("\n✨ Deployment setup complete!\n");
    console.log("Next steps:");
    console.log("1. Review shared/siteConfig.ts");
    console.log("2. Add client logo to client/public/logo.svg");
    console.log("3. Run: pnpm deploy:validate");
    console.log("4. Follow DEPLOYMENT_CHECKLIST.md\n");
    
  } else if (command === "validate") {
    console.log("\n🔍 Validating deployment configuration...\n");
    
    // Check required files
    const requiredFiles = [
      "shared/siteConfig.ts",
      ".client-config.json",
      "DEPLOYMENT_CHECKLIST.md",
    ];
    
    let allValid = true;
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
      } else {
        console.log(`❌ Missing: ${file}`);
        allValid = false;
      }
    }
    
    // Run TypeScript check
    try {
      execSync("pnpm tsc --noEmit", { stdio: "inherit" });
      console.log("✅ TypeScript compilation");
    } catch (error) {
      console.log("❌ TypeScript errors found");
      allValid = false;
    }
    
    // Run tests
    try {
      execSync("pnpm test", { stdio: "inherit" });
      console.log("✅ All tests passing");
    } catch (error) {
      console.log("❌ Test failures");
      allValid = false;
    }
    
    if (allValid) {
      console.log("\n✨ Deployment validation successful!\n");
      console.log("Ready to deploy to client's Manus account.\n");
    } else {
      console.log("\n⚠️  Validation failed. Fix errors above before deploying.\n");
      process.exit(1);
    }
    
  } else {
    console.log("Usage:");
    console.log("  pnpm deploy:setup     - Run interactive setup wizard");
    console.log("  pnpm deploy:validate  - Validate deployment configuration");
  }

  rl.close();
}

main().catch(console.error);
