"""
Media Generation Module.
Generates satirical images using OpenAI's image generation API
and creates short video clips for approved articles.
"""

import json
import os
import base64
import subprocess
import time
from datetime import datetime
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import OPENAI_MODEL, IMAGES_DIR, VIDEOS_DIR
from modules.database import (
    get_articles_by_status, get_article_with_news,
    insert_media, update_media, get_media_for_article
)


def generate_image_prompt(article):
    """Use AI to create an image generation prompt from the article."""
    from openai import OpenAI
    client = OpenAI()
    
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": """You are an art director for a satirical news publication. 
Create image prompts that produce editorial cartoon-style illustrations.
The images should be:
- Satirical and humorous in tone
- In a bold editorial illustration or political cartoon style
- Visually striking with exaggerated features
- Safe for work and not depicting real public figures
- Rich in visual metaphor and symbolism

Return ONLY the image prompt text, nothing else. Keep it under 200 words."""
            },
            {
                "role": "user",
                "content": f"""Create an image generation prompt for this satirical article:

HEADLINE: {article['headline']}
SUBHEADLINE: {article.get('subheadline', '')}
ARTICLE EXCERPT: {article['body'][:500]}

The image should capture the satirical essence of the article in a single striking illustration."""
            }
        ],
        temperature=0.8,
        max_tokens=300,
    )
    
    return response.choices[0].message.content.strip()


def generate_article_image(article):
    """Generate a satirical illustration for an article using OpenAI."""
    from openai import OpenAI
    client = OpenAI()
    
    # Generate the prompt
    print(f"    Creating image prompt...")
    image_prompt = generate_image_prompt(article)
    print(f"    Prompt: {image_prompt[:100]}...")
    
    # Record in database
    media_id = insert_media(article["id"], "image", image_prompt)
    
    try:
        # Generate the image
        print(f"    Generating image...")
        response = client.images.generate(
            model="dall-e-3",
            prompt=f"Editorial cartoon illustration, satirical style: {image_prompt}. Bold colors, exaggerated proportions, newspaper editorial cartoon aesthetic. No text or words in the image.",
            size="1792x1024",
            quality="standard",
            n=1,
        )
        
        # Save the image
        image_url = response.data[0].url
        
        # Download the image
        import requests
        img_response = requests.get(image_url)
        
        filename = f"article_{article['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = IMAGES_DIR / filename
        
        with open(filepath, "wb") as f:
            f.write(img_response.content)
        
        update_media(media_id, str(filepath), "generated")
        print(f"    ✓ Image saved: {filepath}")
        return str(filepath)
        
    except Exception as e:
        print(f"    ✗ Image generation failed: {e}")
        # Try with a simpler approach using gpt-image-1
        try:
            print(f"    Trying alternative image generation...")
            response = client.images.generate(
                model="dall-e-2",
                prompt=f"Editorial cartoon: {image_prompt[:500]}",
                size="1024x1024",
                n=1,
            )
            image_url = response.data[0].url
            import requests
            img_response = requests.get(image_url)
            
            filename = f"article_{article['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            filepath = IMAGES_DIR / filename
            
            with open(filepath, "wb") as f:
                f.write(img_response.content)
            
            update_media(media_id, str(filepath), "generated")
            print(f"    ✓ Image saved (fallback): {filepath}")
            return str(filepath)
        except Exception as e2:
            print(f"    ✗ Fallback also failed: {e2}")
            update_media(media_id, status="failed")
            return None


def generate_video_script(article):
    """Generate a short video script for social media from the article."""
    from openai import OpenAI
    client = OpenAI()
    
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": """You create short, punchy video scripts for satirical news articles.
The script should be for a 15-30 second social media video.
Format: A series of text overlays with timing, designed to be shown over the article's image.
Return a JSON object with:
- "hook": Opening text (attention-grabbing, 5 words max)
- "slides": Array of 3-4 text slides (each 10-15 words max)
- "cta": Call to action text
- "hashtags": Array of 3-5 relevant hashtags"""
            },
            {
                "role": "user",
                "content": f"""Create a video script for this satirical article:

HEADLINE: {article['headline']}
SUBHEADLINE: {article.get('subheadline', '')}
EXCERPT: {article['body'][:300]}"""
            }
        ],
        temperature=0.8,
        max_tokens=500,
    )
    
    content = response.choices[0].message.content.strip()
    if content.startswith("```"):
        import re
        content = re.sub(r'^```(?:json)?\n?', '', content)
        content = re.sub(r'\n?```$', '', content)
    
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {
            "hook": "BREAKING",
            "slides": [article["headline"][:50]],
            "cta": "Read more at The Daily Satirist",
            "hashtags": ["#satire", "#news", "#humor"]
        }


def create_video_from_image(article, image_path):
    """Create a simple animated video from the article image using ffmpeg."""
    if not image_path or not Path(image_path).exists():
        print(f"    Skipping video: no image available")
        return None
    
    media_id = insert_media(article["id"], "video")
    
    try:
        # Generate video script
        print(f"    Creating video script...")
        script = generate_video_script(article)
        
        # Create a simple Ken Burns effect video with text overlay using ffmpeg
        filename = f"article_{article['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
        filepath = VIDEOS_DIR / filename
        
        # Build text overlays
        headline = article["headline"].replace("'", "\\'").replace('"', '\\"').replace(":", "\\:")
        if len(headline) > 60:
            headline = headline[:57] + "..."
        
        # Create video with Ken Burns zoom effect and text overlay
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", str(image_path),
            "-vf", (
                f"scale=1920:1080:force_original_aspect_ratio=increase,"
                f"crop=1920:1080,"
                f"zoompan=z='min(zoom+0.001,1.3)':d=450:s=1920x1080,"
                f"drawtext=text='{headline}':"
                f"fontsize=36:fontcolor=white:borderw=3:bordercolor=black:"
                f"x=(w-text_w)/2:y=h-100:"
                f"enable='between(t,1,14)'"
            ),
            "-c:v", "libx264",
            "-t", "15",
            "-pix_fmt", "yuv420p",
            "-r", "30",
            str(filepath)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            update_media(media_id, str(filepath), "generated")
            print(f"    ✓ Video saved: {filepath}")
            
            # Save video script as metadata
            script_path = VIDEOS_DIR / f"article_{article['id']}_script.json"
            with open(script_path, "w") as f:
                json.dump(script, f, indent=2)
            
            return str(filepath)
        else:
            print(f"    ✗ FFmpeg error: {result.stderr[:200]}")
            update_media(media_id, status="failed")
            return None
            
    except Exception as e:
        print(f"    ✗ Video creation failed: {e}")
        update_media(media_id, status="failed")
        return None


def generate_media_for_approved(batch_date=None):
    """Generate media for all approved articles."""
    if batch_date is None:
        batch_date = datetime.now().strftime("%Y-%m-%d")
    
    print(f"\n{'='*60}")
    print(f"MEDIA GENERATION - Batch: {batch_date}")
    print(f"{'='*60}")
    
    approved = get_articles_by_status("approved", batch_date)
    if not approved:
        # Also check without batch date filter
        approved = get_articles_by_status("approved")
    
    if not approved:
        print("  No approved articles found.")
        return []
    
    print(f"  Generating media for {len(approved)} approved articles...\n")
    
    results = []
    for i, article in enumerate(approved, 1):
        # Check if media already exists
        existing_media = get_media_for_article(article["id"])
        if existing_media:
            generated = [m for m in existing_media if m["status"] == "generated"]
            if generated:
                print(f"  [{i}/{len(approved)}] Media already exists for: {article['headline'][:50]}...")
                results.append({"article_id": article["id"], "media": generated})
                continue
        
        print(f"  [{i}/{len(approved)}] Generating media for: {article['headline'][:50]}...")
        
        # Get full article with news context
        full_article = get_article_with_news(article["id"]) or article
        
        # Generate image
        image_path = generate_article_image(full_article)
        
        # Generate video from image
        video_path = create_video_from_image(full_article, image_path)
        
        results.append({
            "article_id": article["id"],
            "image": image_path,
            "video": video_path,
        })
    
    print(f"\n{'─'*60}")
    print(f"Media generation complete")
    print(f"{'─'*60}")
    
    success_images = len([r for r in results if r.get("image")])
    success_videos = len([r for r in results if r.get("video")])
    print(f"  Images generated: {success_images}/{len(approved)}")
    print(f"  Videos generated: {success_videos}/{len(approved)}")
    
    return results


if __name__ == "__main__":
    from modules.database import init_db
    init_db()
    generate_media_for_approved()
