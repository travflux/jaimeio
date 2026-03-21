"""
Satirical Article Generation Module.
Uses OpenAI to generate highly satirical articles based on news events.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from slugify import slugify

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import OPENAI_MODEL, PUBLICATION_NAME, AUTHOR_NAME
from modules.database import (
    get_news_events_by_date, insert_article, get_all_articles
)


def get_target_word_count():
    """Get target article word count from env var (set by bridge) or default."""
    import os
    val = os.environ.get("SATIRE_TARGET_WORDS", "200")
    try:
        return int(val)
    except ValueError:
        return 200

def get_system_prompt():
    target_words = get_target_word_count()
    return SATIRE_SYSTEM_PROMPT_TEMPLATE.format(target_words=target_words)

SATIRE_SYSTEM_PROMPT_TEMPLATE = """You are a brilliant satirical writer for "The Daily Satirist," a publication in the tradition of The Onion, The Babylon Bee, and Private Eye. Your writing style combines:

1. **Deadpan delivery**: Write in the serious, authoritative tone of a legitimate news outlet while the content is absurd.
2. **Exaggeration**: Take the real news event and push it to its logical (or illogical) extreme.
3. **Irony and sarcasm**: Layer multiple levels of meaning. The surface reads as straight news; the subtext is devastating commentary.
4. **Absurdist humor**: Include ridiculous quotes from fictional experts, officials, or bystanders.
5. **Social commentary**: Use the satire to make a genuine point about society, politics, or human nature.
6. **Specificity**: Include hilariously specific (fake) details — exact percentages, obscure department names, overly precise timestamps.

IMPORTANT RULES:
- The article must be CLEARLY satirical — it should be obvious this is humor, not misinformation.
- Include a mix of real context and absurd fictional elements.
- Create 2-3 fictional quotes from made-up sources with ridiculous titles.
- The headline should be punchy, memorable, and immediately funny.
- Articles should be approximately {target_words} words.
- Write in standard news article format (inverted pyramid).
- Include a fictional dateline (city name).
- NEVER include real people saying things they didn't say. Instead, create obviously fictional characters."""


def generate_satirical_article(news_event):
    """Generate a single satirical article from a news event."""
    from openai import OpenAI
    client = OpenAI()
    
    target_words = get_target_word_count()
    
    prompt = f"""Write a highly satirical news article based on this real news event:

HEADLINE: {news_event['title']}
SUMMARY: {news_event.get('summary', 'No summary available')}
SOURCE: {news_event['source']}

Generate a satirical article. Return your response as a JSON object with these fields:
- "headline": A funny, satirical headline (different from the original)
- "subheadline": A witty subheadline or deck (one sentence)
- "body": The full satirical article (approximately {target_words} words, in plain text with paragraph breaks using \\n\\n)

Return ONLY the JSON object, no other text."""
    
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": get_system_prompt()},
            {"role": "user", "content": prompt},
        ],
        temperature=0.9,
        max_tokens=2000,
    )
    
    content = response.choices[0].message.content.strip()
    
    # Try to parse JSON, handling potential markdown code blocks
    if content.startswith("```"):
        content = re.sub(r'^```(?:json)?\n?', '', content)
        content = re.sub(r'\n?```$', '', content)
    
    try:
        article_data = json.loads(content)
        return article_data
    except json.JSONDecodeError:
        # Fallback: try to extract fields manually
        print(f"    Warning: JSON parse failed, attempting manual extraction")
        return {
            "headline": f"Satirical Take on: {news_event['title'][:60]}",
            "subheadline": "Our writers are working on a better version.",
            "body": content,
        }


def generate_all_articles(batch_date=None):
    """Generate satirical articles for all news events in a batch."""
    if batch_date is None:
        batch_date = datetime.now().strftime("%Y-%m-%d")
    
    print(f"\n{'='*60}")
    print(f"ARTICLE GENERATION - Batch: {batch_date}")
    print(f"{'='*60}")
    
    # Check if articles already exist for this batch
    existing = get_all_articles(batch_date)
    if existing:
        print(f"  Already have {len(existing)} articles for {batch_date}")
        return existing
    
    # Get news events
    events = get_news_events_by_date(batch_date)
    if not events:
        print("  No news events found for this batch date.")
        return []
    
    print(f"  Generating articles for {len(events)} news events...\n")
    
    articles = []
    for i, event in enumerate(events, 1):
        print(f"  [{i}/{len(events)}] Generating article for: {event['title'][:60]}...")
        
        try:
            article_data = generate_satirical_article(event)
            
            headline = article_data.get("headline", "Untitled Satire")
            subheadline = article_data.get("subheadline", "")
            body = article_data.get("body", "")
            slug = slugify(headline)[:80]
            
            # Ensure unique slug
            slug = f"{slug}-{event['id']}"
            
            insert_article(
                news_event_id=event["id"],
                headline=headline,
                subheadline=subheadline,
                body=body,
                slug=slug,
                batch_date=batch_date,
            )
            
            print(f"    ✓ \"{headline[:60]}...\"")
            articles.append(article_data)
            
        except Exception as e:
            print(f"    ✗ Error: {e}")
            continue
    
    stored = get_all_articles(batch_date)
    print(f"\n{'─'*60}")
    print(f"Generated {len(stored)} satirical articles")
    print(f"{'─'*60}")
    
    for i, article in enumerate(stored, 1):
        print(f"  {i:2d}. {article['headline'][:70]}")
    
    return stored


if __name__ == "__main__":
    from modules.database import init_db
    init_db()
    articles = generate_all_articles()
    print(f"\nGenerated {len(articles)} articles.")
