#!/usr/bin/env python3
"""
Bridge Script: Connects the Satirical News Workflow to the Hambry Website.

This script orchestrates the full daily pipeline:
  1. Fetch settings from Hambry's Control Panel
  2. Gather news events from RSS feeds
  3. Generate satirical articles using AI
  4. Import articles into Hambry's database via REST API
  5. Generate social media posts and import them into Hambry

Usage:
  python3 bridge_to_hambry.py full          # Run the complete daily pipeline
  python3 bridge_to_hambry.py gather        # Step 1: Gather news only
  python3 bridge_to_hambry.py generate      # Step 2: Generate articles only
  python3 bridge_to_hambry.py import        # Step 3: Import to Hambry only
  python3 bridge_to_hambry.py social        # Step 4: Generate & import social posts
  python3 bridge_to_hambry.py status        # Check today's workflow status
  python3 bridge_to_hambry.py settings      # Show current settings from Hambry
"""

import json
import os
import re
import sys
import time
import random
import requests
from datetime import datetime
from pathlib import Path
from slugify import slugify

# Add the workflow directory to path
WORKFLOW_DIR = Path(__file__).parent
sys.path.insert(0, str(WORKFLOW_DIR))

from config import RSS_FEEDS as DEFAULT_RSS_FEEDS, TARGET_NEWS_COUNT as DEFAULT_TARGET, OPENAI_MODEL
from modules.database import init_db, get_news_events_by_date, get_all_articles, get_articles_by_status
from modules.news_gatherer import gather_news
from modules.article_generator import generate_all_articles

# ─── Configuration ─────────────────────────────────────────────────────────
HAMBRY_BASE_URL = os.environ.get("HAMBRY_URL", "http://localhost:3000")
HAMBRY_API_KEY = os.environ.get("WORKFLOW_API_KEY", "satire-engine-workflow-default-key")

# Category mapping: map news source topics to Hambry category slugs
CATEGORY_KEYWORDS = {
    "politics": ["politic", "government", "congress", "senate", "president", "election", "democrat", "republican", "vote", "law", "legislation", "white house"],
    "tech": ["tech", "ai", "artificial intelligence", "software", "app", "startup", "silicon valley", "google", "apple", "meta", "microsoft", "amazon", "robot", "cyber", "digital", "internet", "computer"],
    "business": ["business", "economy", "stock", "market", "trade", "bank", "finance", "ceo", "company", "corporate", "wall street", "gdp", "inflation", "recession"],
    "entertainment": ["celebrity", "movie", "film", "music", "tv", "show", "actor", "actress", "netflix", "hollywood", "streaming", "award", "grammy", "oscar", "emmy"],
    "science": ["science", "space", "nasa", "climate", "environment", "research", "study", "discovery", "planet", "health", "medical", "vaccine", "disease", "doctor"],
    "sports": ["sport", "game", "team", "player", "nfl", "nba", "mlb", "soccer", "football", "basketball", "baseball", "olympic", "championship", "coach", "league"],
    "opinion": ["opinion", "editorial", "commentary", "analysis", "perspective"],
}

# ─── Runtime Settings (fetched from Hambry Control Panel) ──────────────────
_runtime_settings = {}

def fetch_settings():
    """Fetch workflow settings from Hambry's Control Panel API."""
    global _runtime_settings
    print("  Fetching settings from Hambry Control Panel...")
    result = api_request("GET", "/settings")
    if result and "settings" in result:
        _runtime_settings = result["settings"]
        print(f"  Loaded {len(_runtime_settings)} settings from Control Panel.")
    else:
        print("  Could not fetch settings. Using defaults.")
        _runtime_settings = {}
    return _runtime_settings

def get_setting(key, default=None):
    """Get a setting value, falling back to default if not set."""
    return _runtime_settings.get(key, default)

def get_setting_int(key, default):
    """Get a setting as integer."""
    val = _runtime_settings.get(key)
    if val is not None:
        try:
            return int(val)
        except (ValueError, TypeError):
            pass
    return default

def get_setting_bool(key, default=False):
    """Get a setting as boolean."""
    val = _runtime_settings.get(key)
    if val is not None:
        return val.lower() in ("true", "1", "yes")
    return default

def get_setting_json(key, default=None):
    """Get a setting as parsed JSON."""
    val = _runtime_settings.get(key)
    if val:
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            pass
    return default if default is not None else []

def get_target_article_count():
    """Get the target number of articles per batch from settings."""
    return get_setting_int("articles_per_batch", DEFAULT_TARGET)

def get_rss_feeds():
    """Get RSS feeds from settings, falling back to defaults."""
    feeds_json = get_setting_json("rss_feeds")
    if feeds_json and isinstance(feeds_json, list) and len(feeds_json) > 0:
        # Convert URL strings to feed dicts
        feeds = []
        for item in feeds_json:
            if isinstance(item, str):
                feeds.append({"name": item.split("/")[2] if "/" in item else item, "url": item})
            elif isinstance(item, dict):
                feeds.append(item)
        return feeds
    return DEFAULT_RSS_FEEDS

def get_ai_style_prompt():
    """Get the AI writing style prompt from settings."""
    style = get_setting("ai_writing_style", "onion")
    
    style_prompts = {
        "onion": "Write in the style of The Onion — absurd, deadpan, and hilarious. Use fake quotes from made-up sources. The humor should come from treating absurd premises with complete journalistic seriousness.",
        "babylon": "Write in the style of The Babylon Bee — satirical, culturally aware, with a sharp edge. Mix real cultural observations with absurd conclusions.",
        "borowitz": "Write in the style of the Borowitz Report — dry wit, political satire, short punchy paragraphs. Focus on irony and understatement.",
        "clickhole": "Write in the style of ClickHole — absurdist, surreal, over-the-top internet parody. Push the absurdity to its logical extreme.",
    }
    
    if style == "custom":
        custom = get_setting("ai_custom_prompt", "")
        if custom:
            return custom
        return style_prompts["onion"]  # fallback
    
    return style_prompts.get(style, style_prompts["onion"])

def get_default_status():
    """Get the default article status from settings."""
    return get_setting("default_status", "pending")

def get_social_platforms():
    """Get the list of active social media platforms."""
    platforms_str = get_setting("social_platforms", "twitter,facebook,linkedin")
    return [p.strip() for p in platforms_str.split(",") if p.strip()]


def api_request(method, endpoint, data=None, params=None):
    """Make an authenticated request to the Hambry workflow API."""
    url = f"{HAMBRY_BASE_URL}/api/workflow{endpoint}"
    headers = {
        "X-API-Key": HAMBRY_API_KEY,
        "Content-Type": "application/json",
    }
    try:
        response = requests.request(method, url, json=data, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"  API Error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"  Response: {e.response.text[:500]}")
        return None


def guess_category(title, summary=""):
    """Guess the best Hambry category based on article content."""
    text = (title + " " + summary).lower()
    scores = {}
    for cat_slug, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[cat_slug] = score
    if scores:
        return max(scores, key=scores.get)
    return "opinion"  # Default fallback


def get_category_id_map():
    """Fetch categories from Hambry and build a slug->id map."""
    result = api_request("GET", "/categories")
    if not result:
        return {}
    return {c["slug"]: c["id"] for c in result}


# ─── Step 1: Gather News ──────────────────────────────────────────────────

def step_gather(batch_date):
    """Gather news events from RSS feeds, using Control Panel settings."""
    print(f"\n{'='*60}")
    print(f"STEP 1: GATHERING NEWS — {batch_date}")
    print(f"{'='*60}")

    target_count = get_target_article_count()
    print(f"  Target article count: {target_count} (from Control Panel)")

    # Override config values with Control Panel settings
    import config
    config.TARGET_NEWS_COUNT = target_count

    # Check if custom RSS feeds are configured
    custom_feeds = get_rss_feeds()
    if custom_feeds != DEFAULT_RSS_FEEDS:
        config.RSS_FEEDS = custom_feeds
        print(f"  Using {len(custom_feeds)} custom RSS feeds from Control Panel")
    else:
        print(f"  Using {len(DEFAULT_RSS_FEEDS)} default RSS feeds")

    # Create or get workflow batch in Hambry
    batch_result = api_request("POST", "/batch", {
        "batchDate": batch_date,
        "totalEvents": target_count,
    })
    if batch_result:
        batch_id = batch_result["id"]
        api_request("PATCH", f"/batch/{batch_id}", {"status": "gathering"})
        print(f"  Hambry batch ID: {batch_id}")
    else:
        batch_id = None
        print("  Warning: Could not create Hambry batch (server may be offline)")

    # Run the existing news gatherer
    events = gather_news(batch_date)

    # Update batch status
    if batch_id:
        api_request("PATCH", f"/batch/{batch_id}", {
            "status": "generating",
            "totalEvents": len(events),
        })

    return events, batch_id


# ─── Step 2: Generate Articles ────────────────────────────────────────────

def step_generate(batch_date):
    """Generate satirical articles for gathered news events, using Control Panel style."""
    print(f"\n{'='*60}")
    print(f"STEP 2: GENERATING SATIRICAL ARTICLES — {batch_date}")
    print(f"{'='*60}")

    style_prompt = get_ai_style_prompt()
    style_name = get_setting("ai_writing_style", "onion")
    print(f"  AI writing style: {style_name}")
    print(f"  Style prompt: {style_prompt[:80]}...")

    # Pass settings to the article_generator module via environment
    os.environ["SATIRE_STYLE_PROMPT"] = style_prompt
    target_words = get_setting_int("target_article_length", 200)
    os.environ["SATIRE_TARGET_WORDS"] = str(target_words)
    print(f"  Target article length: {target_words} words")

    articles = generate_all_articles(batch_date)
    return articles


# ─── Step 3: Import to Hambry ─────────────────────────────────────────────

def step_import(batch_date, batch_id=None):
    """Import generated articles into Hambry's database."""
    print(f"\n{'='*60}")
    print(f"STEP 3: IMPORTING TO HAMBRY — {batch_date}")
    print(f"{'='*60}")

    default_status = get_default_status()
    print(f"  Default article status: {default_status}")

    # Get articles from the local workflow database
    articles = get_all_articles(batch_date)
    if not articles:
        print("  No articles found for this batch date.")
        return []

    # Get events for source info
    events = get_news_events_by_date(batch_date)
    event_map = {e["id"]: e for e in events}

    # Get category mapping from Hambry
    cat_map = get_category_id_map()
    print(f"  Available categories: {list(cat_map.keys())}")

    # Respect max publications per day
    max_publish = get_setting_int("max_publish_per_day", 50)
    articles_to_import = articles[:max_publish]
    if len(articles) > max_publish:
        print(f"  Throttled: importing {max_publish} of {len(articles)} articles (max_publish_per_day)")

    # Prepare articles for import
    hambry_articles = []
    for article in articles_to_import:
        event = event_map.get(article.get("news_event_id"))
        source_event = event["title"] if event else None
        source_url = event["source_url"] if event else None

        # Guess category
        cat_slug = guess_category(
            article["headline"],
            article.get("subheadline", "") + " " + (source_event or "")
        )
        category_id = cat_map.get(cat_slug)

        # Ensure unique slug
        slug = slugify(article["headline"])[:80]
        slug = f"{slug}-{article['id']}"

        # Format body as HTML paragraphs if not already
        body = article["body"]
        if not body.strip().startswith("<"):
            paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
            body = "".join(f"<p>{p}</p>" for p in paragraphs)

        hambry_articles.append({
            "headline": article["headline"],
            "subheadline": article.get("subheadline"),
            "body": body,
            "slug": slug,
            "status": default_status,
            "categoryId": category_id,
            "batchDate": batch_date,
            "sourceEvent": source_event,
            "sourceUrl": source_url,
        })

    # Bulk import to Hambry
    print(f"  Importing {len(hambry_articles)} articles to Hambry...")
    result = api_request("POST", "/articles/import", {"articles": hambry_articles})

    if result:
        print(f"  Successfully imported {result.get('count', 0)} articles!")
        imported_ids = result.get("ids", [])

        # Update batch status
        if batch_id:
            api_request("PATCH", f"/batch/{batch_id}", {
                "status": "pending_approval",
                "articlesGenerated": len(imported_ids),
            })

        return imported_ids
    else:
        print("  Failed to import articles.")
        return []


# ─── Step 3.5: Generate Media ────────────────────────────────────────────

def step_media(batch_date, article_ids=None):
    """Generate featured images for approved articles via Hambry's media API."""
    print(f"\n{'='*60}")
    print(f"STEP 3.5: MEDIA GENERATION — {batch_date}")
    print(f"{'='*60}")

    auto_gen = get_setting_bool("auto_generate_images", False)
    if not auto_gen:
        print("  Auto-generate images is DISABLED in Control Panel. Skipping.")
        print("  Enable it in Workflow > Generation Settings to auto-generate images.")
        return []

    # Call the media generation endpoint
    payload = {}
    if article_ids:
        payload["articleIds"] = article_ids
    else:
        payload["batchDate"] = batch_date

    print(f"  Requesting media generation from Hambry...")
    result = api_request("POST", "/articles/generate-media", payload)

    if result:
        generated = result.get("generated", 0)
        failed = result.get("failed", 0)
        print(f"  Images generated: {generated}")
        if failed > 0:
            print(f"  Failed: {failed}")
        for r in result.get("results", []):
            if r.get("success"):
                print(f"    ✓ Article {r['articleId']}: {r.get('imageUrl', 'generated')[:60]}...")
            else:
                print(f"    ✗ Article {r['articleId']}: {r.get('error', 'unknown error')}")
        return result.get("results", [])
    else:
        print("  Media generation request failed.")
        return []


# ─── Step 4: Social Media Posts ───────────────────────────────────────────

def step_social(batch_date, batch_id=None):
    """Generate social media posts for approved articles and import to Hambry."""
    print(f"\n{'='*60}")
    print(f"STEP 4: SOCIAL MEDIA POSTS — {batch_date}")
    print(f"{'='*60}")

    # Check if auto-create is enabled
    auto_social = get_setting_bool("auto_create_social_posts", True)
    if not auto_social:
        print("  Auto-create social posts is DISABLED in Control Panel. Skipping.")
        return []

    active_platforms = get_social_platforms()
    print(f"  Active platforms: {', '.join(active_platforms)}")

    # Get approved/published articles from Hambry
    result = api_request("GET", "/articles", params={
        "batchDate": batch_date,
        "status": "approved",
    })

    if not result or not result.get("articles"):
        # Try published articles
        result = api_request("GET", "/articles", params={
            "batchDate": batch_date,
            "status": "published",
        })

    if not result or not result.get("articles"):
        print("  No approved/published articles found. Approve articles first via the admin dashboard.")
        return []

    articles = result["articles"]
    print(f"  Found {len(articles)} articles for social post generation.")

    from openai import OpenAI
    client = OpenAI()

    platform_instructions = {
        "twitter": '"twitter": Tweet (max 260 chars total including link and hashtags). Punchy, witty, 1-2 hashtags. MUST end with article link.',
        "facebook": '"facebook": Facebook post (max 260 chars total including link and hashtags). Conversational, 1-2 hashtags. MUST end with article link.',
        "linkedin": '"linkedin": LinkedIn post (max 260 chars total including link and hashtags). Professional satire. 1-2 hashtags. MUST end with article link.',
        "instagram": '"instagram": Instagram caption (max 260 chars total including link and hashtags). Fun, 2-3 hashtags. MUST end with article link.',
        "threads": '"threads": Threads post (max 260 chars total including link and hashtags). Casual, witty. 1-2 hashtags. MUST end with article link.',
    }

    # Build platform-specific instructions
    platform_prompt_parts = [platform_instructions[p] for p in active_platforms if p in platform_instructions]
    platforms_json_keys = ", ".join(f'"{p}"' for p in active_platforms)

    all_posts = []
    # Get the site base URL for article links
    site_base_url = HAMBRY_API_BASE.replace("/api/workflow", "")

    for i, article in enumerate(articles, 1):
        article_slug = article.get("slug", "")
        article_url = f"{site_base_url}/article/{article_slug}" if article_slug else site_base_url
        print(f"\n  [{i}/{len(articles)}] Generating social posts for: {article['headline'][:50]}...")

        try:
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": f"""You create engaging social media posts for a satirical news publication.
Each post should be witty, attention-grabbing, and drive clicks to the full article.

STRICT RULE: Every post on EVERY platform MUST be 260 characters or fewer (including the article link and hashtags).
Every post MUST end with the article link.

Article link: {article_url}

Return a JSON object with these keys: {platforms_json_keys}
{chr(10).join('- ' + p for p in platform_prompt_parts)}

Return ONLY the JSON object."""
                    },
                    {
                        "role": "user",
                        "content": f"Create social media posts for:\nHEADLINE: {article['headline']}\nSUBHEADLINE: {article.get('subheadline', '')}"
                    }
                ],
                temperature=0.8,
                max_tokens=800,
            )

            content = response.choices[0].message.content.strip()
            # Clean markdown code blocks if present
            if content.startswith("```"):
                content = re.sub(r'^```(?:json)?\n?', '', content)
                content = re.sub(r'\n?```$', '', content)

            posts = json.loads(content)

            # Create social post records for Hambry (only for active platforms)
            for platform in active_platforms:
                if platform in posts:
                    all_posts.append({
                        "articleId": article["id"],
                        "platform": platform,
                        "content": posts[platform],
                        "status": "draft",
                    })
                    print(f"    {platform}: {posts[platform][:60]}...")

        except Exception as e:
            print(f"    Error generating posts: {e}")
            continue

    # Bulk import social posts to Hambry
    if all_posts:
        print(f"\n  Importing {len(all_posts)} social posts to Hambry...")
        result = api_request("POST", "/social/import", {"posts": all_posts})
        if result:
            print(f"  Successfully imported {result.get('count', 0)} social posts!")
        else:
            print("  Failed to import social posts.")

    # Send to FeedHive if configured
    feedhive_url = get_setting("feedhive_trigger_url", "")
    if feedhive_url and all_posts:
        print(f"\n  Sending {len(all_posts)} posts to FeedHive...")
        step_feedhive(batch_date, all_posts, articles)
    elif not feedhive_url:
        print("\n  FeedHive not configured. Posts saved to Hambry queue only.")
        print("  Set your FeedHive trigger URL in Workflow > Social Media to enable auto-posting.")

    # Update batch
    if batch_id:
        api_request("PATCH", f"/batch/{batch_id}", {"status": "completed"})

    return all_posts


# ─── Step 5: FeedHive Distribution ───────────────────────────────────────

def step_feedhive(batch_date, social_posts=None, articles=None):
    """Send social media posts to FeedHive via trigger URL."""
    print(f"\n{'='*60}")
    print(f"STEP 5: FEEDHIVE DISTRIBUTION — {batch_date}")
    print(f"{'='*60}")

    feedhive_url = get_setting("feedhive_trigger_url", "")
    if not feedhive_url:
        print("  FeedHive trigger URL not configured. Skipping.")
        print("  Set it in Workflow > Social Media in the admin dashboard.")
        return

    include_image = get_setting_bool("feedhive_include_image", True)
    feedhive_mode = get_setting("feedhive_mode", "draft")
    print(f"  FeedHive mode: {feedhive_mode}")
    print(f"  Include images: {include_image}")

    # If no posts passed, fetch from Hambry
    if not social_posts:
        # Get approved/published articles
        result = api_request("GET", "/articles", params={
            "batchDate": batch_date,
            "status": "published",
        })
        if not result or not result.get("articles"):
            result = api_request("GET", "/articles", params={
                "batchDate": batch_date,
                "status": "approved",
            })
        if not result or not result.get("articles"):
            print("  No published/approved articles found.")
            return
        articles = result["articles"]

    # Build FeedHive payloads — send one consolidated post per article
    # (FeedHive handles multi-platform distribution internally)
    articles_map = {}
    if articles:
        for a in articles:
            articles_map[a.get("id")] = a

    # Deduplicate: pick the best post per article (prefer twitter for brevity)
    article_posts = {}
    if social_posts:
        for p in social_posts:
            aid = p.get("articleId")
            if aid not in article_posts:
                article_posts[aid] = p
            elif p.get("platform") == "twitter":
                article_posts[aid] = p

    feedhive_payloads = []
    for aid, post in article_posts.items():
        payload = {"text": post.get("content", "")}
        article = articles_map.get(aid, {})
        if include_image and article.get("featuredImage"):
            payload["media_urls"] = [article["featuredImage"]]
        if post.get("socialPostId"):
            payload["socialPostId"] = post["socialPostId"]
        payload["articleId"] = aid
        feedhive_payloads.append(payload)

    if not feedhive_payloads:
        print("  No posts to send to FeedHive.")
        return

    print(f"  Sending {len(feedhive_payloads)} posts to FeedHive...")

    # Use the bulk-send endpoint
    result = api_request("POST", "/feedhive/bulk-send", {"posts": feedhive_payloads})
    if result:
        print(f"  Sent: {result.get('sent', 0)}/{result.get('total', 0)}")
        if result.get('failed', 0) > 0:
            print(f"  Failed: {result.get('failed', 0)}")
    else:
        # Fallback: send directly to FeedHive
        print("  Bulk endpoint failed. Sending directly to FeedHive...")
        sent = 0
        for payload in feedhive_payloads:
            try:
                resp = requests.post(
                    feedhive_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=15,
                )
                if resp.ok:
                    sent += 1
                    print(f"    Sent: {payload['text'][:50]}...")
                else:
                    print(f"    Failed ({resp.status_code}): {payload['text'][:50]}...")
                time.sleep(0.5)  # Rate limit
            except Exception as e:
                print(f"    Error: {e}")
        print(f"  Direct send complete: {sent}/{len(feedhive_payloads)}")


# ─── Full Pipeline ────────────────────────────────────────────────────────

def run_full_pipeline(batch_date=None):
    """Run the complete daily workflow pipeline."""
    if batch_date is None:
        batch_date = datetime.now().strftime("%Y-%m-%d")

    print(f"\n{'#'*60}")
    print(f"  HAMBRY DAILY SATIRICAL NEWS WORKFLOW")
    print(f"  Date: {batch_date}")
    print(f"  Server: {HAMBRY_BASE_URL}")
    print(f"{'#'*60}")

    # Check Hambry health
    health = api_request("GET", "/health")
    if not health:
        print("\n  ERROR: Cannot reach Hambry server. Make sure it's running.")
        print(f"  Expected at: {HAMBRY_BASE_URL}")
        return

    print(f"\n  Hambry server: OK ({health.get('timestamp', 'connected')})")

    # Check if workflow is enabled
    fetch_settings()
    if not get_setting_bool("workflow_enabled", True):
        print("\n  WORKFLOW IS DISABLED in Control Panel. Exiting.")
        print("  Enable it from the Workflow Control Panel in the admin dashboard.")
        return

    # Print active settings
    print(f"\n  ── Active Settings ──")
    print(f"  Articles per batch: {get_target_article_count()}")
    print(f"  AI writing style:   {get_setting('ai_writing_style', 'onion')}")
    print(f"  Default status:     {get_default_status()}")
    print(f"  Max publish/day:    {get_setting_int('max_publish_per_day', 50)}")
    print(f"  Target word count:  {get_setting_int('target_article_length', 200)}")
    print(f"  Auto-gen images:    {get_setting_bool('auto_generate_images', False)}")
    print(f"  Social platforms:   {', '.join(get_social_platforms())}")
    feeds = get_rss_feeds()
    print(f"  RSS feeds:          {len(feeds)} sources")

    # Initialize local workflow database
    init_db()

    # Step 1: Gather news
    events, batch_id = step_gather(batch_date)
    if not events:
        print("\n  No news events gathered. Stopping.")
        return

    # Step 2: Generate articles
    articles = step_generate(batch_date)
    if not articles:
        print("\n  No articles generated. Stopping.")
        return

    # Step 3: Import to Hambry
    imported_ids = step_import(batch_date, batch_id)
    if not imported_ids:
        print("\n  No articles imported. Check the Hambry server.")
        return

    print(f"\n{'#'*60}")
    print(f"  PIPELINE COMPLETE!")
    print(f"  {len(events)} news events gathered")
    print(f"  {len(articles)} satirical articles generated")
    print(f"  {len(imported_ids)} articles imported to Hambry")
    print(f"")
    # Step 3.5: Generate media (if auto-generate is enabled)
    auto_gen = get_setting_bool("auto_generate_images", False)
    if auto_gen:
        step_media(batch_date, imported_ids)
    else:
        print(f"\n  Auto-generate images is OFF. You can generate images manually")
        print(f"  from the article editor, or enable it in the Control Panel.")

    print(f"\n{'#'*60}")
    print(f"  PIPELINE COMPLETE!")
    print(f"  {len(events)} news events gathered")
    print(f"  {len(articles)} satirical articles generated")
    print(f"  {len(imported_ids)} articles imported to Hambry")
    if auto_gen:
        print(f"  Featured images auto-generated")
    print(f"")
    print(f"  NEXT STEPS:")
    print(f"  1. Go to the Hambry admin dashboard to review articles")
    print(f"  2. Approve or reject each article (edit if needed)")
    print(f"  3. Run: python3 bridge_to_hambry.py social")
    print(f"     to generate social media posts for approved articles")
    print(f"  4. Publish approved articles from the admin dashboard")
    print(f"{'#'*60}")


def check_status(batch_date=None):
    """Check the current workflow status."""
    if batch_date is None:
        batch_date = datetime.now().strftime("%Y-%m-%d")

    print(f"\n{'='*60}")
    print(f"WORKFLOW STATUS — {batch_date}")
    print(f"{'='*60}")

    # Check Hambry health
    health = api_request("GET", "/health")
    if health:
        print(f"  Hambry server: ONLINE")
    else:
        print(f"  Hambry server: OFFLINE")

    # Fetch and display settings
    if health:
        fetch_settings()
        print(f"\n  ── Control Panel Settings ──")
        print(f"  Workflow enabled:   {get_setting_bool('workflow_enabled', True)}")
        print(f"  Articles per batch: {get_target_article_count()}")
        print(f"  AI style:           {get_setting('ai_writing_style', 'onion')}")
        print(f"  Default status:     {get_default_status()}")
        print(f"  Max publish/day:    {get_setting_int('max_publish_per_day', 50)}")
        print(f"  Social platforms:   {', '.join(get_social_platforms())}")

    # Check local workflow data
    init_db()
    events = get_news_events_by_date(batch_date)
    articles = get_all_articles(batch_date)
    approved = get_articles_by_status("approved", batch_date)

    print(f"\n  ── Local Workflow Data ──")
    print(f"  News events: {len(events)}")
    print(f"  Articles:    {len(articles)}")
    print(f"  Approved:    {len(approved)}")

    # Check Hambry data
    if health:
        hambry_articles = api_request("GET", "/articles", params={"batchDate": batch_date})
        if hambry_articles:
            arts = hambry_articles.get("articles", [])
            print(f"\n  ── Hambry Data ──")
            print(f"  Total articles: {len(arts)}")
            statuses = {}
            for a in arts:
                s = a.get("status", "unknown")
                statuses[s] = statuses.get(s, 0) + 1
            for s, c in sorted(statuses.items()):
                print(f"    {s}: {c}")


def show_settings():
    """Display all current settings from the Hambry Control Panel."""
    print(f"\n{'='*60}")
    print(f"HAMBRY CONTROL PANEL SETTINGS")
    print(f"{'='*60}")

    health = api_request("GET", "/health")
    if not health:
        print("  ERROR: Cannot reach Hambry server.")
        return

    settings = fetch_settings()
    if not settings:
        print("  No settings found. Using all defaults.")
        return

    # Group by category
    result = api_request("GET", "/settings")
    if result and "raw" in result:
        categories = {}
        for s in result["raw"]:
            cat = s.get("category", "general")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(s)

        for cat, items in sorted(categories.items()):
            print(f"\n  ── {cat.upper()} ──")
            for s in items:
                label = s.get("label") or s.get("key", "unknown")
                value = s.get("value") or ""
                # Truncate long values
                if len(str(value)) > 60:
                    value = str(value)[:57] + "..."
                print(f"  {label:35s} = {value}")


# ─── CLI Entry Point ─────────────────────────────────────────────────────

if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "full"
    batch_date = sys.argv[2] if len(sys.argv) > 2 else datetime.now().strftime("%Y-%m-%d")

    # For commands that need settings, fetch them first
    if command in ("full", "gather", "generate", "import", "media", "social", "feedhive"):
        health = api_request("GET", "/health")
        if health:
            fetch_settings()
        else:
            print("  Warning: Hambry server not reachable. Using default settings.")

    if command == "full":
        run_full_pipeline(batch_date)
    elif command == "gather":
        init_db()
        step_gather(batch_date)
    elif command == "generate":
        init_db()
        step_generate(batch_date)
    elif command == "import":
        init_db()
        step_import(batch_date)
    elif command == "media":
        init_db()
        step_media(batch_date)
    elif command == "social":
        init_db()
        step_social(batch_date)
    elif command == "feedhive":
        init_db()
        step_feedhive(batch_date)
    elif command == "status":
        check_status(batch_date)
    elif command == "settings":
        show_settings()
    else:
        print(f"Unknown command: {command}")
        print("Usage: python3 bridge_to_hambry.py [full|gather|generate|import|media|social|feedhive|status|settings] [YYYY-MM-DD]")
        sys.exit(1)
