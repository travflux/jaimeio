"""
Configuration for the Satirical News Workflow.
All settings are centralized here for easy modification.
"""

import os
from pathlib import Path

# ─── Paths ───────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"
ARTICLES_DIR = OUTPUT_DIR / "articles"
IMAGES_DIR = OUTPUT_DIR / "images"
VIDEOS_DIR = OUTPUT_DIR / "videos"
WEBSITE_DIR = OUTPUT_DIR / "website"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
DB_PATH = DATA_DIR / "workflow.db"

# Ensure directories exist
for d in [DATA_DIR, ARTICLES_DIR, IMAGES_DIR, VIDEOS_DIR, WEBSITE_DIR, TEMPLATES_DIR, STATIC_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ─── News Gathering ─────────────────────────────────────────────────────────
RSS_FEEDS = [
    # Major wire services and news outlets
    {"name": "Reuters - World", "url": "https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best"},
    {"name": "AP News", "url": "https://rsshub.app/apnews/topics/apf-topnews"},
    {"name": "BBC News - World", "url": "http://feeds.bbci.co.uk/news/world/rss.xml"},
    {"name": "BBC News - Top Stories", "url": "http://feeds.bbci.co.uk/news/rss.xml"},
    {"name": "NPR News", "url": "https://feeds.npr.org/1001/rss.xml"},
    {"name": "The Guardian - World", "url": "https://www.theguardian.com/world/rss"},
    {"name": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml"},
    {"name": "CNN Top Stories", "url": "http://rss.cnn.com/rss/edition.rss"},
    {"name": "NBC News", "url": "https://feeds.nbcnews.com/nbcnews/public/news"},
    {"name": "CBS News", "url": "https://www.cbsnews.com/latest/rss/main"},
    {"name": "ABC News", "url": "https://abcnews.go.com/abcnews/topstories"},
    {"name": "Google News - Top Stories", "url": "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"},
    {"name": "Google News - World", "url": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXigAQ?hl=en-US&gl=US&ceid=US:en"},
    {"name": "Google News - US", "url": "https://news.google.com/rss/topics/CAAqIggKIhxDQkFTRHdvSkwyMHZNRGxqTjNjd0VnSmxiaWdBUAE?hl=en-US&gl=US&ceid=US:en"},
    {"name": "Google News - Technology", "url": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXigAQ?hl=en-US&gl=US&ceid=US:en"},
    {"name": "Google News - Business", "url": "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXigAQ?hl=en-US&gl=US&ceid=US:en"},
]

# Number of articles to gather
TARGET_NEWS_COUNT = 20

# ─── OpenAI ──────────────────────────────────────────────────────────────────
OPENAI_MODEL = "gpt-4.1-mini"
OPENAI_IMAGE_MODEL = "gpt-4.1-mini"  # For image generation via the API

# ─── Approval Dashboard ─────────────────────────────────────────────────────
DASHBOARD_HOST = "0.0.0.0"
DASHBOARD_PORT = 5000

# ─── Website ─────────────────────────────────────────────────────────────────
SITE_NAME = "The Daily Satirist"
SITE_TAGLINE = "All the News That's Fit to Mock"
SITE_URL = "https://thedailysatirist.com"

# ─── Social Media (Buffer) ──────────────────────────────────────────────────
BUFFER_ACCESS_TOKEN = os.environ.get("BUFFER_ACCESS_TOKEN", "")
BUFFER_API_URL = "https://api.bufferapp.com/1"

# ─── Publication Settings ────────────────────────────────────────────────────
PUBLICATION_NAME = "The Daily Satirist"
AUTHOR_NAME = "The Daily Satirist Staff"
