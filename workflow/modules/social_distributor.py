"""
Social Media Distribution Module.
Distributes approved articles to social media platforms via Buffer API.
Also supports direct posting to Twitter/X, Facebook, and LinkedIn APIs.

Buffer Setup:
1. Create a Buffer account at https://buffer.com
2. Connect your social media profiles
3. Get your access token from https://buffer.com/developers/api
4. Set BUFFER_ACCESS_TOKEN environment variable

Alternative: Direct API posting (requires individual platform API keys).
"""

import json
import os
import requests
from datetime import datetime, timedelta
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    BUFFER_ACCESS_TOKEN, BUFFER_API_URL, SITE_URL, SITE_NAME,
    OPENAI_MODEL
)
from modules.database import (
    get_articles_by_status, get_article_with_news,
    get_media_for_article, insert_publication, update_publication
)


def generate_social_posts(article):
    """Generate platform-specific social media posts for an article."""
    from openai import OpenAI
    client = OpenAI()
    
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": """You create engaging social media posts for a satirical news publication.
Each post should be witty, attention-grabbing, and drive clicks to the full article.
Adapt the tone and format for each platform.

Return a JSON object with these keys:
- "twitter": Tweet text (max 260 chars, leave room for link). Punchy, witty, may include 1-2 hashtags.
- "facebook": Facebook post (2-3 sentences). Conversational, may ask a question. Include 2-3 hashtags.
- "linkedin": LinkedIn post (2-3 sentences). Slightly more professional satire angle. Include 2-3 hashtags.
- "instagram": Instagram caption (2-3 sentences). Fun, engaging. Include 5-8 hashtags.
- "threads": Threads post (1-2 sentences). Casual, witty. Include 1-2 hashtags.

Return ONLY the JSON object."""
            },
            {
                "role": "user",
                "content": f"""Create social media posts for this satirical article:

HEADLINE: {article['headline']}
SUBHEADLINE: {article.get('subheadline', '')}
EXCERPT: {article['body'][:300]}"""
            }
        ],
        temperature=0.8,
        max_tokens=800,
    )
    
    content = response.choices[0].message.content.strip()
    if content.startswith("```"):
        import re
        content = re.sub(r'^```(?:json)?\n?', '', content)
        content = re.sub(r'\n?```$', '', content)
    
    try:
        posts = json.loads(content)
        return posts
    except json.JSONDecodeError:
        # Fallback
        headline = article["headline"]
        return {
            "twitter": f"{headline[:200]} #satire #news",
            "facebook": f"{headline}\n\nRead more at {SITE_NAME}! #satire #humor #news",
            "linkedin": f"{headline}\n\nLatest from {SITE_NAME}. #satire #media",
            "instagram": f"{headline}\n\n#satire #news #humor #comedy #funny #trending #viral",
            "threads": f"{headline} #satire #news",
        }


# ─── Buffer API Integration ─────────────────────────────────────────────────

class BufferClient:
    """Client for the Buffer API."""
    
    def __init__(self, access_token=None):
        self.access_token = access_token or BUFFER_ACCESS_TOKEN
        self.base_url = BUFFER_API_URL
    
    def _request(self, method, endpoint, **kwargs):
        """Make an authenticated request to the Buffer API."""
        url = f"{self.base_url}/{endpoint}.json"
        params = kwargs.get("params", {})
        params["access_token"] = self.access_token
        kwargs["params"] = params
        
        response = requests.request(method, url, **kwargs)
        return response.json()
    
    def get_profiles(self):
        """Get all connected social media profiles."""
        return self._request("GET", "profiles")
    
    def create_update(self, profile_ids, text, media=None, scheduled_at=None):
        """Create a new update (post) on Buffer."""
        data = {
            "text": text,
            "profile_ids[]": profile_ids,
        }
        
        if media:
            if "link" in media:
                data["media[link]"] = media["link"]
            if "description" in media:
                data["media[description]"] = media["description"]
            if "photo" in media:
                data["media[photo]"] = media["photo"]
        
        if scheduled_at:
            data["scheduled_at"] = scheduled_at
        
        return self._request("POST", "updates/create", data=data)
    
    def get_pending_updates(self, profile_id):
        """Get pending updates for a profile."""
        return self._request("GET", f"profiles/{profile_id}/updates/pending")


# ─── Direct Social Media Posting (Fallback) ─────────────────────────────────

class DirectPoster:
    """Direct posting to social media platforms via their APIs.
    Requires individual API keys set as environment variables."""
    
    def __init__(self):
        self.twitter_bearer = os.environ.get("TWITTER_BEARER_TOKEN", "")
        self.facebook_token = os.environ.get("FACEBOOK_PAGE_TOKEN", "")
        self.linkedin_token = os.environ.get("LINKEDIN_ACCESS_TOKEN", "")
    
    def post_to_twitter(self, text, image_path=None):
        """Post to Twitter/X using the v2 API."""
        if not self.twitter_bearer:
            return {"status": "skipped", "reason": "No Twitter API token configured"}
        
        headers = {
            "Authorization": f"Bearer {self.twitter_bearer}",
            "Content-Type": "application/json",
        }
        
        data = {"text": text}
        
        try:
            response = requests.post(
                "https://api.twitter.com/2/tweets",
                headers=headers,
                json=data,
            )
            return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def post_to_facebook(self, page_id, text, link=None):
        """Post to a Facebook Page."""
        if not self.facebook_token:
            return {"status": "skipped", "reason": "No Facebook API token configured"}
        
        data = {
            "message": text,
            "access_token": self.facebook_token,
        }
        if link:
            data["link"] = link
        
        try:
            response = requests.post(
                f"https://graph.facebook.com/v18.0/{page_id}/feed",
                data=data,
            )
            return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def post_to_linkedin(self, org_id, text, link=None):
        """Post to LinkedIn organization page."""
        if not self.linkedin_token:
            return {"status": "skipped", "reason": "No LinkedIn API token configured"}
        
        headers = {
            "Authorization": f"Bearer {self.linkedin_token}",
            "Content-Type": "application/json",
        }
        
        post_data = {
            "author": f"urn:li:organization:{org_id}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "ARTICLE" if link else "NONE",
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }
        
        if link:
            post_data["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [{
                "status": "READY",
                "originalUrl": link,
            }]
        
        try:
            response = requests.post(
                "https://api.linkedin.com/v2/ugcPosts",
                headers=headers,
                json=post_data,
            )
            return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}


# ─── Main Distribution Function ─────────────────────────────────────────────

def distribute_to_social_media(batch_date=None):
    """Distribute approved articles to social media platforms."""
    if batch_date is None:
        batch_date = datetime.now().strftime("%Y-%m-%d")
    
    print(f"\n{'='*60}")
    print(f"SOCIAL MEDIA DISTRIBUTION - Batch: {batch_date}")
    print(f"{'='*60}")
    
    # Get approved articles
    approved = get_articles_by_status("approved", batch_date)
    if not approved:
        approved = get_articles_by_status("approved")
    
    if not approved:
        print("  No approved articles found.")
        return []
    
    print(f"  Distributing {len(approved)} articles to social media...\n")
    
    # Check which distribution method to use
    use_buffer = bool(BUFFER_ACCESS_TOKEN)
    
    if use_buffer:
        print("  Using Buffer API for distribution")
        buffer = BufferClient()
        try:
            profiles = buffer.get_profiles()
            print(f"  Connected profiles: {len(profiles)}")
        except Exception as e:
            print(f"  Buffer API error: {e}")
            use_buffer = False
    
    if not use_buffer:
        print("  Buffer not configured. Generating social posts for manual distribution.")
        print("  (Set BUFFER_ACCESS_TOKEN to enable automatic posting)")
    
    results = []
    
    for i, article in enumerate(approved, 1):
        full_article = get_article_with_news(article["id"]) or article
        article_url = f"{SITE_URL}/{article['slug']}.html"
        
        print(f"\n  [{i}/{len(approved)}] {article['headline'][:50]}...")
        
        # Generate platform-specific posts
        print(f"    Generating social media posts...")
        posts = generate_social_posts(full_article)
        
        # Save generated posts
        posts_file = Path(f"data/social_posts_{article['id']}.json")
        posts_file.parent.mkdir(parents=True, exist_ok=True)
        with open(posts_file, "w") as f:
            json.dump({
                "article_id": article["id"],
                "headline": article["headline"],
                "url": article_url,
                "posts": posts,
                "generated_at": datetime.now().isoformat(),
            }, f, indent=2)
        
        if use_buffer:
            # Post via Buffer
            for platform, text in posts.items():
                try:
                    post_text = f"{text}\n\n{article_url}"
                    # Buffer will handle posting to the right profiles
                    result = buffer.create_update(
                        profile_ids=[],  # Buffer will use all connected profiles
                        text=post_text,
                        media={"link": article_url},
                    )
                    
                    pub_id = insert_publication(article["id"], platform)
                    if "success" in result:
                        update_publication(pub_id, "published")
                        print(f"    ✓ {platform}: Posted via Buffer")
                    else:
                        update_publication(pub_id, "failed")
                        print(f"    ✗ {platform}: {result.get('message', 'Unknown error')}")
                except Exception as e:
                    print(f"    ✗ {platform}: {e}")
        else:
            # Save for manual posting
            for platform, text in posts.items():
                pub_id = insert_publication(article["id"], platform)
                update_publication(pub_id, "pending", article_url)
                print(f"    📝 {platform}: Post saved for manual distribution")
        
        results.append({
            "article_id": article["id"],
            "posts": posts,
            "url": article_url,
        })
    
    # Generate a summary file for manual posting
    if not use_buffer:
        summary_file = Path(f"data/social_media_queue_{batch_date}.md")
        with open(summary_file, "w") as f:
            f.write(f"# Social Media Queue - {batch_date}\n\n")
            f.write(f"Generated by {SITE_NAME}\n\n")
            f.write("---\n\n")
            
            for result in results:
                article = get_article_with_news(result["article_id"])
                f.write(f"## {article['headline']}\n\n")
                f.write(f"**URL:** {result['url']}\n\n")
                
                for platform, text in result["posts"].items():
                    f.write(f"### {platform.title()}\n\n")
                    f.write(f"```\n{text}\n```\n\n")
                
                f.write("---\n\n")
        
        print(f"\n  Social media queue saved to: {summary_file}")
    
    print(f"\n{'─'*60}")
    print(f"Social media distribution complete")
    print(f"  Articles processed: {len(results)}")
    print(f"  Distribution method: {'Buffer API' if use_buffer else 'Manual queue generated'}")
    print(f"{'─'*60}")
    
    return results


if __name__ == "__main__":
    from modules.database import init_db
    init_db()
    distribute_to_social_media()
