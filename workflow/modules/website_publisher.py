"""
Website Distribution Module.
Generates a static website from approved articles using Jinja2 templates.
The site can be deployed to any static hosting service (GitHub Pages, Netlify, Vercel, etc.).
"""

import json
import shutil
from datetime import datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, BaseLoader

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    WEBSITE_DIR, IMAGES_DIR, TEMPLATES_DIR, STATIC_DIR,
    SITE_NAME, SITE_TAGLINE, SITE_URL, AUTHOR_NAME
)
from modules.database import (
    get_articles_by_status, get_article_with_news,
    get_media_for_article, insert_publication, update_publication
)


# ─── Inline Templates (also saved to templates/ for customization) ───────────

INDEX_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ site_name }} - {{ site_tagline }}</title>
    <meta name="description" content="{{ site_tagline }}">
    <meta property="og:title" content="{{ site_name }}">
    <meta property="og:description" content="{{ site_tagline }}">
    <meta property="og:type" content="website">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header class="site-header">
        <div class="container">
            <div class="masthead">
                <div class="date-line">{{ generation_date }}</div>
                <h1 class="site-title"><a href="index.html">{{ site_name }}</a></h1>
                <p class="site-tagline">{{ site_tagline }}</p>
                <div class="header-rule"></div>
            </div>
        </div>
    </header>

    <main class="container">
        {% if featured %}
        <section class="featured-article">
            <article class="article-card featured">
                {% if featured.image %}
                <div class="article-image">
                    <a href="{{ featured.slug }}.html">
                        <img src="images/{{ featured.image }}" alt="{{ featured.headline }}">
                    </a>
                </div>
                {% endif %}
                <div class="article-content">
                    <h2><a href="{{ featured.slug }}.html">{{ featured.headline }}</a></h2>
                    {% if featured.subheadline %}
                    <p class="subheadline">{{ featured.subheadline }}</p>
                    {% endif %}
                    <p class="excerpt">{{ featured.excerpt }}</p>
                    <div class="article-meta">
                        <span class="author">{{ author }}</span> · 
                        <span class="date">{{ featured.date }}</span>
                    </div>
                </div>
            </article>
        </section>
        {% endif %}

        <section class="article-grid">
            {% for article in articles %}
            <article class="article-card">
                {% if article.image %}
                <div class="article-image">
                    <a href="{{ article.slug }}.html">
                        <img src="images/{{ article.image }}" alt="{{ article.headline }}" loading="lazy">
                    </a>
                </div>
                {% endif %}
                <div class="article-content">
                    <h3><a href="{{ article.slug }}.html">{{ article.headline }}</a></h3>
                    {% if article.subheadline %}
                    <p class="subheadline">{{ article.subheadline }}</p>
                    {% endif %}
                    <p class="excerpt">{{ article.excerpt }}</p>
                    <div class="article-meta">
                        <span class="date">{{ article.date }}</span>
                    </div>
                </div>
            </article>
            {% endfor %}
        </section>
    </main>

    <footer class="site-footer">
        <div class="container">
            <p>&copy; {{ year }} {{ site_name }}. All articles are satirical and for entertainment purposes only.</p>
            <p class="disclaimer">DISCLAIMER: This is a satirical publication. All articles are fictional and intended as humor. 
            Any resemblance to actual events is used as a basis for comedy. Named sources are fictional.</p>
        </div>
    </footer>
</body>
</html>"""

ARTICLE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ article.headline }} - {{ site_name }}</title>
    <meta name="description" content="{{ article.subheadline or article.excerpt }}">
    <meta property="og:title" content="{{ article.headline }}">
    <meta property="og:description" content="{{ article.subheadline or article.excerpt }}">
    <meta property="og:type" content="article">
    {% if article.image %}
    <meta property="og:image" content="{{ site_url }}/images/{{ article.image }}">
    {% endif %}
    <meta name="twitter:card" content="summary_large_image">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header class="site-header">
        <div class="container">
            <div class="masthead">
                <h1 class="site-title"><a href="index.html">{{ site_name }}</a></h1>
                <p class="site-tagline">{{ site_tagline }}</p>
                <div class="header-rule"></div>
            </div>
        </div>
    </header>

    <main class="container">
        <article class="article-full">
            <header class="article-header">
                <h1 class="article-title">{{ article.headline }}</h1>
                {% if article.subheadline %}
                <p class="article-subheadline">{{ article.subheadline }}</p>
                {% endif %}
                <div class="article-meta">
                    <span class="author">By {{ author }}</span> · 
                    <span class="date">{{ article.date }}</span>
                </div>
            </header>

            {% if article.image %}
            <div class="article-hero-image">
                <img src="images/{{ article.image }}" alt="{{ article.headline }}">
            </div>
            {% endif %}

            <div class="article-body">
                {% for paragraph in article.paragraphs %}
                <p>{{ paragraph }}</p>
                {% endfor %}
            </div>

            <footer class="article-footer">
                <div class="disclaimer-box">
                    <strong>SATIRE DISCLAIMER:</strong> This article is satirical and intended for entertainment purposes only. 
                    All quotes are from fictional characters. Any resemblance to real events is used as a basis for comedy.
                </div>
                <div class="share-links">
                    <strong>Share this article:</strong>
                    <a href="https://twitter.com/intent/tweet?text={{ article.headline | urlencode }}&url={{ site_url }}/{{ article.slug }}.html" target="_blank">Twitter/X</a> · 
                    <a href="https://www.facebook.com/sharer/sharer.php?u={{ site_url }}/{{ article.slug }}.html" target="_blank">Facebook</a> · 
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url={{ site_url }}/{{ article.slug }}.html" target="_blank">LinkedIn</a>
                </div>
                <a href="index.html" class="back-link">← Back to Home</a>
            </footer>
        </article>
    </main>

    <footer class="site-footer">
        <div class="container">
            <p>&copy; {{ year }} {{ site_name }}. All articles are satirical and for entertainment purposes only.</p>
        </div>
    </footer>
</body>
</html>"""

SITE_CSS = """
/* The Daily Satirist - Newspaper-Style CSS */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600&display=swap');

:root {
    --color-bg: #faf8f5;
    --color-text: #1a1a1a;
    --color-accent: #8b0000;
    --color-gold: #c9a96e;
    --color-gray: #666;
    --color-light-gray: #e8e4df;
    --color-card-bg: #ffffff;
    --font-display: 'Playfair Display', Georgia, serif;
    --font-body: 'Source Serif 4', Georgia, serif;
    --font-ui: 'Inter', -apple-system, sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: var(--font-body);
    background: var(--color-bg);
    color: var(--color-text);
    line-height: 1.7;
}

.container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header */
.site-header {
    background: var(--color-card-bg);
    border-bottom: 3px double var(--color-text);
    padding: 20px 0;
}

.masthead { text-align: center; }

.date-line {
    font-family: var(--font-ui);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: var(--color-gray);
    margin-bottom: 10px;
}

.site-title {
    font-family: var(--font-display);
    font-size: 52px;
    font-weight: 900;
    letter-spacing: -1px;
    line-height: 1.1;
}

.site-title a {
    color: var(--color-text);
    text-decoration: none;
}

.site-tagline {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 16px;
    color: var(--color-gray);
    margin-top: 5px;
}

.header-rule {
    height: 2px;
    background: linear-gradient(to right, transparent, var(--color-text), transparent);
    margin-top: 15px;
}

/* Featured Article */
.featured-article {
    margin: 30px 0;
    border-bottom: 2px solid var(--color-light-gray);
    padding-bottom: 30px;
}

.article-card.featured {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 30px;
    align-items: start;
}

.article-card.featured h2 {
    font-family: var(--font-display);
    font-size: 36px;
    line-height: 1.2;
    margin-bottom: 12px;
}

.article-card.featured h2 a {
    color: var(--color-text);
    text-decoration: none;
}

.article-card.featured h2 a:hover {
    color: var(--color-accent);
}

/* Article Grid */
.article-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 30px;
    margin: 30px 0;
}

.article-card {
    background: var(--color-card-bg);
    border-radius: 4px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
}

.article-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.article-image img {
    width: 100%;
    height: 220px;
    object-fit: cover;
    display: block;
}

.article-content {
    padding: 20px;
}

.article-card h3 {
    font-family: var(--font-display);
    font-size: 22px;
    line-height: 1.3;
    margin-bottom: 8px;
}

.article-card h3 a {
    color: var(--color-text);
    text-decoration: none;
}

.article-card h3 a:hover {
    color: var(--color-accent);
}

.subheadline {
    font-style: italic;
    color: var(--color-gray);
    font-size: 15px;
    margin-bottom: 8px;
}

.excerpt {
    font-size: 15px;
    color: #444;
    margin-bottom: 10px;
}

.article-meta {
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--color-gray);
}

/* Full Article Page */
.article-full {
    max-width: 720px;
    margin: 40px auto;
}

.article-header {
    margin-bottom: 30px;
    text-align: center;
}

.article-title {
    font-family: var(--font-display);
    font-size: 42px;
    line-height: 1.2;
    margin-bottom: 12px;
}

.article-subheadline {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 20px;
    color: var(--color-gray);
    margin-bottom: 15px;
}

.article-hero-image {
    margin: 25px -40px;
}

.article-hero-image img {
    width: 100%;
    border-radius: 4px;
}

.article-body {
    font-size: 18px;
    line-height: 1.8;
}

.article-body p {
    margin-bottom: 20px;
}

.article-footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 2px solid var(--color-light-gray);
}

.disclaimer-box {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    padding: 15px;
    font-size: 14px;
    margin-bottom: 20px;
}

.share-links {
    font-family: var(--font-ui);
    font-size: 14px;
    margin-bottom: 15px;
}

.share-links a {
    color: var(--color-accent);
    text-decoration: none;
}

.share-links a:hover {
    text-decoration: underline;
}

.back-link {
    font-family: var(--font-ui);
    font-size: 14px;
    color: var(--color-accent);
    text-decoration: none;
}

/* Footer */
.site-footer {
    background: var(--color-text);
    color: #ccc;
    padding: 30px 0;
    margin-top: 50px;
    text-align: center;
    font-size: 14px;
}

.site-footer .disclaimer {
    font-size: 12px;
    margin-top: 10px;
    opacity: 0.7;
}

/* Responsive */
@media (max-width: 768px) {
    .site-title { font-size: 36px; }
    .article-card.featured { grid-template-columns: 1fr; }
    .article-card.featured h2 { font-size: 28px; }
    .article-grid { grid-template-columns: 1fr; }
    .article-title { font-size: 32px; }
    .article-hero-image { margin: 20px 0; }
}
"""


def prepare_article_data(article):
    """Prepare article data for template rendering."""
    media = get_media_for_article(article["id"])
    image_file = None
    for m in media:
        if m["media_type"] == "image" and m["status"] == "generated" and m["file_path"]:
            image_file = Path(m["file_path"]).name
            break
    
    body = article["body"]
    paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
    excerpt = paragraphs[0][:200] + "..." if paragraphs else ""
    
    return {
        "id": article["id"],
        "headline": article["headline"],
        "subheadline": article.get("subheadline", ""),
        "body": body,
        "paragraphs": paragraphs,
        "excerpt": excerpt,
        "slug": article["slug"],
        "image": image_file,
        "date": article.get("batch_date", datetime.now().strftime("%Y-%m-%d")),
    }


def generate_website(batch_date=None):
    """Generate the static website from approved articles."""
    if batch_date is None:
        batch_date = datetime.now().strftime("%Y-%m-%d")
    
    print(f"\n{'='*60}")
    print(f"WEBSITE GENERATION - Batch: {batch_date}")
    print(f"{'='*60}")
    
    # Get approved articles
    approved = get_articles_by_status("approved", batch_date)
    if not approved:
        approved = get_articles_by_status("approved")
    
    if not approved:
        print("  No approved articles found.")
        return None
    
    print(f"  Building website for {len(approved)} approved articles...")
    
    # Prepare output directory
    site_dir = WEBSITE_DIR / batch_date
    site_dir.mkdir(parents=True, exist_ok=True)
    images_out = site_dir / "images"
    images_out.mkdir(exist_ok=True)
    
    # Set up Jinja2 environment
    env = Environment(loader=BaseLoader())
    
    # Write CSS
    css_path = site_dir / "style.css"
    css_path.write_text(SITE_CSS)
    
    # Prepare article data and copy images
    articles_data = []
    for article in approved:
        data = prepare_article_data(article)
        articles_data.append(data)
        
        # Copy image to website directory
        if data["image"]:
            src = IMAGES_DIR / data["image"]
            if src.exists():
                shutil.copy2(src, images_out / data["image"])
    
    # Generate index page
    print("  Generating index page...")
    index_template = env.from_string(INDEX_TEMPLATE)
    
    featured = articles_data[0] if articles_data else None
    remaining = articles_data[1:] if len(articles_data) > 1 else []
    
    index_html = index_template.render(
        site_name=SITE_NAME,
        site_tagline=SITE_TAGLINE,
        site_url=SITE_URL,
        author=AUTHOR_NAME,
        generation_date=datetime.now().strftime("%A, %B %d, %Y"),
        featured=featured,
        articles=remaining,
        year=datetime.now().year,
    )
    (site_dir / "index.html").write_text(index_html)
    
    # Generate individual article pages
    article_template = env.from_string(ARTICLE_TEMPLATE)
    for data in articles_data:
        print(f"  Generating: {data['slug']}.html")
        article_html = article_template.render(
            site_name=SITE_NAME,
            site_tagline=SITE_TAGLINE,
            site_url=SITE_URL,
            author=AUTHOR_NAME,
            article=data,
            year=datetime.now().year,
        )
        (site_dir / f"{data['slug']}.html").write_text(article_html)
        
        # Record publication
        pub_id = insert_publication(data["id"], "website")
        update_publication(pub_id, "published", f"{SITE_URL}/{data['slug']}.html")
    
    print(f"\n{'─'*60}")
    print(f"Website generated at: {site_dir}")
    print(f"  Index: {site_dir / 'index.html'}")
    print(f"  Articles: {len(articles_data)} pages")
    print(f"  Images: {len(list(images_out.glob('*')))}")
    print(f"{'─'*60}")
    
    return str(site_dir)


if __name__ == "__main__":
    from modules.database import init_db
    init_db()
    generate_website()
