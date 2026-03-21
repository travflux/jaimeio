"""
News Gathering Module.
Fetches recent news events from RSS feeds and deduplicates them.
Uses OpenAI to select the 20 most satirically interesting events.
"""

import feedparser
import hashlib
import re
import time
from datetime import datetime, timedelta
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import RSS_FEEDS, TARGET_NEWS_COUNT, OPENAI_MODEL
from modules.database import insert_news_event, get_news_events_by_date


def fetch_rss_feeds():
    """Fetch and parse all configured RSS feeds."""
    all_entries = []
    
    for feed_config in RSS_FEEDS:
        try:
            print(f"  Fetching: {feed_config['name']}...")
            # Set timeout to prevent hanging on slow/unresponsive feeds
            import socket
            original_timeout = socket.getdefaulttimeout()
            socket.setdefaulttimeout(30)  # 30 second timeout
            try:
                feed = feedparser.parse(feed_config["url"])
            finally:
                socket.setdefaulttimeout(original_timeout)
            
            if feed.bozo and not feed.entries:
                print(f"    Warning: Feed error for {feed_config['name']}: {feed.bozo_exception}")
                continue
            
            for entry in feed.entries[:15]:  # Limit per feed
                title = entry.get("title", "").strip()
                if not title:
                    continue
                
                summary = entry.get("summary", entry.get("description", "")).strip()
                # Clean HTML from summary
                summary = re.sub(r'<[^>]+>', '', summary)
                summary = summary[:500]  # Truncate long summaries
                
                link = entry.get("link", "")
                
                # Parse published date
                published = entry.get("published_parsed") or entry.get("updated_parsed")
                if published:
                    published_date = time.strftime("%Y-%m-%d %H:%M:%S", published)
                else:
                    published_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                all_entries.append({
                    "title": title,
                    "summary": summary,
                    "source": feed_config["name"],
                    "source_url": link,
                    "published_date": published_date,
                })
            
            print(f"    Got {min(len(feed.entries), 15)} entries")
            
        except Exception as e:
            print(f"    Error fetching {feed_config['name']}: {e}")
            continue
    
    return all_entries


def deduplicate_entries(entries):
    """Remove duplicate entries based on title similarity."""
    seen_titles = {}
    unique_entries = []
    
    for entry in entries:
        # Create a normalized key from the title
        normalized = re.sub(r'[^a-z0-9\s]', '', entry["title"].lower())
        words = set(normalized.split())
        
        # Check for similar titles (Jaccard similarity)
        is_duplicate = False
        for key, existing_words in seen_titles.items():
            if len(words) == 0 or len(existing_words) == 0:
                continue
            intersection = words & existing_words
            union = words | existing_words
            similarity = len(intersection) / len(union)
            if similarity > 0.6:
                is_duplicate = True
                break
        
        if not is_duplicate:
            seen_titles[normalized] = words
            unique_entries.append(entry)
    
    return unique_entries


def select_top_events(entries, count=TARGET_NEWS_COUNT):
    """Use OpenAI to select the most satirically interesting events."""
    from openai import OpenAI
    client = OpenAI()
    
    # Prepare the list of entries for the AI
    entries_text = ""
    for i, entry in enumerate(entries[:80], 1):  # Limit to 80 candidates
        entries_text += f"{i}. [{entry['source']}] {entry['title']}\n"
        if entry['summary']:
            entries_text += f"   Summary: {entry['summary'][:200]}\n"
        entries_text += "\n"
    
    prompt = f"""You are an editor for a satirical news publication called "The Daily Satirist." 
Your job is to select the {count} most satirically interesting news events from today's headlines.

Choose events that:
1. Have strong comedic potential for satire
2. Cover a diverse range of topics (politics, tech, business, culture, science, etc.)
3. Are genuinely newsworthy and current
4. Would resonate with a broad audience
5. Lend themselves to exaggeration, irony, or absurdist humor

Here are today's news headlines:

{entries_text}

Return ONLY a JSON array of the numbers (1-indexed) of your top {count} selections, in order of satirical potential.
Example: [3, 7, 12, 1, 15, 22, 8, 45, 33, 11, 5, 28, 19, 42, 37, 2, 14, 25, 31, 9]

Return ONLY the JSON array, nothing else."""

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=200,
    )
    
    import json
    try:
        selected_indices = json.loads(response.choices[0].message.content.strip())
        # Convert to 0-indexed and filter valid indices
        selected = []
        for idx in selected_indices:
            if 1 <= idx <= len(entries) and len(selected) < count:
                selected.append(entries[idx - 1])
        return selected
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        print(f"  Warning: AI selection failed ({e}), using first {count} entries")
        return entries[:count]


def gather_news(batch_date=None):
    """Main function: gather, deduplicate, select, and store news events."""
    if batch_date is None:
        batch_date = datetime.now().strftime("%Y-%m-%d")
    
    print(f"\n{'='*60}")
    print(f"NEWS GATHERING - Batch: {batch_date}")
    print(f"{'='*60}")
    
    # Check if we already have events for today
    existing = get_news_events_by_date(batch_date)
    if existing:
        print(f"  Already have {len(existing)} events for {batch_date}")
        return existing
    
    # Step 1: Fetch RSS feeds
    print("\n[Step 1] Fetching RSS feeds...")
    raw_entries = fetch_rss_feeds()
    print(f"  Total raw entries: {len(raw_entries)}")
    
    # Step 2: Deduplicate
    print("\n[Step 2] Deduplicating entries...")
    unique_entries = deduplicate_entries(raw_entries)
    print(f"  Unique entries: {len(unique_entries)}")
    
    # Step 3: AI-powered selection
    print(f"\n[Step 3] Selecting top {TARGET_NEWS_COUNT} satirical candidates...")
    if len(unique_entries) > TARGET_NEWS_COUNT:
        selected = select_top_events(unique_entries, TARGET_NEWS_COUNT)
    else:
        selected = unique_entries[:TARGET_NEWS_COUNT]
    print(f"  Selected: {len(selected)} events")
    
    # Step 4: Store in database
    print("\n[Step 4] Storing events in database...")
    for event in selected:
        insert_news_event(
            title=event["title"],
            summary=event["summary"],
            source=event["source"],
            source_url=event["source_url"],
            published_date=event["published_date"],
            batch_date=batch_date,
        )
    
    stored = get_news_events_by_date(batch_date)
    print(f"  Stored: {len(stored)} events")
    
    # Print summary
    print(f"\n{'─'*60}")
    print("Selected News Events:")
    print(f"{'─'*60}")
    for i, event in enumerate(stored, 1):
        print(f"  {i:2d}. [{event['source']}] {event['title'][:80]}")
    
    return stored


if __name__ == "__main__":
    from modules.database import init_db
    init_db()
    events = gather_news()
    print(f"\nGathered {len(events)} news events.")
