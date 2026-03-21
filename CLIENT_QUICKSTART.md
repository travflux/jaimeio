# Hambry Engine - Client Quick Start Guide

Welcome to your new satirical news platform! This guide will help you get started with your Hambry Engine deployment.

## What You've Got

Your Hambry Engine includes:

✅ **Automated Content Creation** - Discovers news from RSS feeds and generates satirical articles daily  
✅ **AI Media Generation** - Creates images and videos for your articles  
✅ **Social Media Distribution** - Auto-posts to Twitter, Facebook, LinkedIn, Instagram, Threads, and Reddit  
✅ **Admin Dashboard** - Full control over content, settings, and workflow  
✅ **Comment System** - Engage with your audience  
✅ **Newsletter** - Build your subscriber base  

## First Steps

### 1. Access Your Admin Dashboard

Navigate to: `https://your-domain.com/admin`

You'll see:
- **Dashboard** - Overview of your site statistics
- **Articles** - Manage all your content
- **Optimizer** - Configure automated workflows
- **Categories** - Organize your content
- **Comments** - Moderate discussions
- **Newsletter** - Manage subscribers

### 2. Configure Your Workflow

Go to **Admin → Optimizer** to set up your automated content engine:

#### RSS Feeds Tab
Add news sources to pull content from:
1. Click "Add Feed"
2. Enter RSS feed URL (e.g., `https://techcrunch.com/feed/`)
3. Set refresh interval
4. Save

**Recommended feeds:**
- TechCrunch: `https://techcrunch.com/feed/`
- The Verge: `https://www.theverge.com/rss/index.xml`
- Ars Technica: `https://feeds.arstechnica.com/arstechnica/index`
- Wired: `https://www.wired.com/feed/rss`

#### Workflow Settings Tab
Configure your daily automation:
- **Articles per batch**: How many articles to generate (default: 20)
- **Auto-approve**: Automatically approve generated articles
- **Auto-publish**: Automatically publish approved articles
- **Auto-generate images**: Create featured images automatically
- **Auto-generate videos**: Create videos for articles
- **Auto-create social posts**: Generate social media posts on publish
- **Auto-post on publish**: Immediately post to social media

**Recommended settings for beginners:**
- Articles per batch: 10
- Auto-approve: ❌ (review articles first)
- Auto-publish: ❌ (publish manually)
- Auto-generate images: ✅
- Auto-generate videos: ❌ (expensive, enable later)
- Auto-create social posts: ✅
- Auto-post on publish: ❌ (review posts first)

#### Image Providers Tab
Configure image generation:
1. Select provider (Manus, Replicate, OpenAI, or Custom)
2. Enter API key (if required)
3. Customize style prompt
4. Save settings

**Manus provider** is pre-configured and ready to use!

#### Video Tools Tab
Configure video generation (optional):
1. Select provider (Manus, Replicate, OpenAI, or Custom)
2. Enter API key (if required)
3. Set duration (5-60 seconds)
4. Choose aspect ratio (16:9, 9:16, or 1:1)
5. Customize style prompt
6. Save settings

**Note:** Video generation is expensive. Start without it and enable later.

#### Social Distribution Tab
Connect your social media accounts:

**FeedHive Setup:**
1. Sign up at [feedhive.com](https://feedhive.com)
2. Get your webhook trigger URL
3. Paste it in "FeedHive Trigger URL"
4. Enable platforms you want to use
5. Save

**Reddit Setup:**
1. Create Reddit app at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Enter Client ID and Client Secret
3. Enter your Reddit username and password
4. Specify target subreddit (e.g., `r/satire`)
5. Choose post type (link or text)
6. Save

### 3. Run Your First Workflow

Once configured:

1. Go to **Admin → Optimizer → Dashboard**
2. Click **"Run Workflow Now"**
3. Wait for the batch to complete (5-10 minutes)
4. Review generated articles in **Admin → Articles**

The workflow will:
- ✅ Fetch latest news from your RSS feeds
- ✅ Generate satirical articles
- ✅ Create featured images
- ✅ Save as drafts (if auto-approve is off)

### 4. Review and Publish Articles

Go to **Admin → Articles**:

1. Click on an article to edit
2. Review the content, headline, and image
3. Make any adjustments
4. Click **"Approve"** or **"Publish"**

**Article Editor Features:**
- **AI Assist** - Regenerate content, images, or videos
- **SEO** - Optimize title and meta description
- **Categories** - Assign to categories
- **Featured Image** - Upload or generate new image
- **Video** - Generate video content (if enabled)

### 5. Manage Social Media Posts

When you publish an article (and auto-create social posts is enabled):

1. Go to **Admin → Optimizer → Social Composer**
2. Review generated posts for each platform
3. Edit if needed
4. Click **"Post to FeedHive"** to publish

**Post Types:**
- **Twitter/X** - Short, punchy (280 chars)
- **Facebook** - Engaging with context
- **LinkedIn** - Professional tone
- **Instagram** - Visual focus with hashtags
- **Threads** - Conversational
- **Reddit** - Community-appropriate

### 6. Schedule Automated Workflow

To run the workflow automatically every day:

1. Go to **Admin → Optimizer → Workflow Settings**
2. Enable **"Run Daily"**
3. Set time (e.g., 6:00 AM)
4. Save

The engine will now generate fresh content every day automatically!

## Understanding Your Workflow

### Daily Automation Flow

```
RSS Feeds → Discover News → Generate Articles → Create Media → Publish → Social Media
```

**Step 1: RSS Discovery**
- Checks your configured RSS feeds
- Finds new articles
- Filters out duplicates (won't reuse sources from last 30 days)

**Step 2: Article Generation**
- Selects top stories
- Generates satirical takes
- Creates headlines and content
- Assigns categories

**Step 3: Media Creation**
- Generates featured images
- Creates videos (if enabled)
- Extracts thumbnails

**Step 4: Approval** (if auto-approve is off)
- Articles saved as drafts
- You review and approve
- Edit as needed

**Step 5: Publishing** (if auto-publish is on)
- Articles go live on your site
- Social posts created automatically
- Posted to social media (if auto-post is on)

## Content Management Tips

### Writing Style
Your engine generates content in your configured style:
- **Genre**: Technology, Politics, Business, etc.
- **Tone**: Witty, Absurd, Dry, etc.

Adjust these in `Admin → Optimizer → Workflow Settings`.

### Categories
Organize content with categories:
1. Go to **Admin → Categories**
2. Add categories relevant to your niche
3. Articles auto-assigned based on content

### Comments
Moderate discussions:
1. Go to **Admin → Comments**
2. Review, approve, or delete comments
3. Enable/disable comments per article

### Newsletter
Build your audience:
1. Go to **Admin → Newsletter**
2. View subscribers
3. Export email list
4. Send newsletters via your email platform

## Customization

### Branding
Your site is already customized with your branding. To make changes:
- Contact your Hambry Engine provider
- Request branding updates
- Changes will be deployed to your site

### Content Settings
Adjust content generation:
1. **Admin → Optimizer → Workflow Settings**
2. Modify:
   - Articles per batch
   - Content style
   - Media generation
   - Social posting

### RSS Feeds
Add/remove news sources:
1. **Admin → Optimizer → RSS Feeds**
2. Add feeds in your niche
3. Remove irrelevant sources

## Monitoring Performance

### Dashboard Stats
**Admin → Dashboard** shows:
- Total articles
- Published articles
- Pending approvals
- Total comments
- Newsletter subscribers
- Recent activity

### Workflow Batches
**Admin → Optimizer → Dashboard** shows:
- Recent workflow runs
- Articles generated per batch
- Success/failure rates
- Batch details

### Analytics
Track your site's performance:
- Page views
- Popular articles
- Traffic sources
- Engagement metrics

## Troubleshooting

### Articles Not Generating?
1. Check RSS feed URLs are valid
2. Verify workflow settings
3. Ensure API keys are configured
4. Contact support if issues persist

### Images Not Appearing?
1. Check image provider settings
2. Verify API key is valid
3. Try regenerating image in article editor
4. Switch to different provider if needed

### Social Posts Failing?
1. Verify FeedHive/Reddit credentials
2. Check platform is enabled
3. Review post content (may violate platform rules)
4. Test with manual post first

### Workflow Not Running?
1. Check scheduled time is correct
2. Verify "Run Daily" is enabled
3. Check for error messages in dashboard
4. Contact support for assistance

## Best Practices

### Content Quality
- Review articles before publishing (especially at first)
- Edit headlines for maximum impact
- Ensure images match article tone
- Check for factual accuracy in satire

### Social Media
- Post at optimal times for your audience
- Engage with comments and replies
- Mix automated posts with manual content
- Monitor platform analytics

### SEO
- Use descriptive headlines
- Add meta descriptions
- Include relevant keywords
- Share on social media for backlinks

### Audience Building
- Promote newsletter signup
- Engage with commenters
- Share on multiple platforms
- Collaborate with other sites

## Getting Help

### Documentation
- [Full Documentation](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Admin Guide](./ADMIN.md)

### Support
Contact your Hambry Engine provider:
- Email: [Your provider's email]
- Response time: [Based on your license tier]

### Community
- Join the Hambry Engine community
- Share tips and best practices
- Get inspiration from other clients

## Next Steps

Now that you're set up:

1. ✅ Configure your workflow settings
2. ✅ Add RSS feeds
3. ✅ Run your first batch
4. ✅ Review and publish articles
5. ✅ Connect social media
6. ✅ Schedule daily automation
7. ✅ Monitor performance
8. ✅ Engage with your audience

**Welcome to automated satirical journalism!** 🎉

Your Hambry Engine is ready to generate engaging content and grow your audience on autopilot.
