"""
Approval Dashboard Module.
A Flask web application for reviewing and approving/rejecting satirical articles.
"""

import json
from datetime import datetime
from pathlib import Path
from flask import Flask, render_template_string, request, redirect, url_for, jsonify, flash

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DASHBOARD_HOST, DASHBOARD_PORT, SITE_NAME
from modules.database import (
    get_all_articles, get_article_with_news, update_article_status,
    get_articles_by_status, get_media_for_article, get_publications_for_article,
    init_db
)

app = Flask(__name__)
app.secret_key = "satirical-news-workflow-secret-key-2026"

# ─── HTML Templates ──────────────────────────────────────────────────────────

DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ site_name }} - Editorial Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Georgia', serif; 
            background: #f5f0eb; 
            color: #2c2c2c; 
            line-height: 1.6;
        }
        .header {
            background: #1a1a2e;
            color: #e8d5b7;
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 4px solid #c9a96e;
        }
        .header h1 { font-size: 28px; letter-spacing: 2px; }
        .header .subtitle { font-style: italic; opacity: 0.8; font-size: 14px; }
        .nav {
            background: #16213e;
            padding: 10px 40px;
            display: flex;
            gap: 20px;
        }
        .nav a {
            color: #e8d5b7;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            transition: background 0.2s;
        }
        .nav a:hover, .nav a.active { background: #c9a96e; color: #1a1a2e; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-top: 4px solid #c9a96e;
        }
        .stat-card .number { font-size: 36px; font-weight: bold; color: #1a1a2e; }
        .stat-card .label { font-size: 14px; color: #666; margin-top: 5px; }
        .stat-card.pending .number { color: #e67e22; }
        .stat-card.approved .number { color: #27ae60; }
        .stat-card.rejected .number { color: #e74c3c; }
        .article-list { display: flex; flex-direction: column; gap: 15px; }
        .article-card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 5px solid #ccc;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .article-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
        .article-card.pending { border-left-color: #e67e22; }
        .article-card.approved { border-left-color: #27ae60; }
        .article-card.rejected { border-left-color: #e74c3c; }
        .article-card h3 { font-size: 20px; margin-bottom: 8px; }
        .article-card h3 a { color: #1a1a2e; text-decoration: none; }
        .article-card h3 a:hover { color: #c9a96e; }
        .article-card .meta { font-size: 13px; color: #888; margin-bottom: 10px; }
        .article-card .subheadline { font-style: italic; color: #555; margin-bottom: 10px; }
        .article-card .preview { color: #444; font-size: 15px; }
        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-badge.pending { background: #ffeaa7; color: #e67e22; }
        .status-badge.approved { background: #d4efdf; color: #27ae60; }
        .status-badge.rejected { background: #fadbd8; color: #e74c3c; }
        .actions { margin-top: 15px; display: flex; gap: 10px; }
        .btn {
            padding: 8px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: opacity 0.2s;
        }
        .btn:hover { opacity: 0.85; }
        .btn-approve { background: #27ae60; color: white; }
        .btn-reject { background: #e74c3c; color: white; }
        .btn-view { background: #3498db; color: white; }
        .btn-reset { background: #95a5a6; color: white; }
        .flash { padding: 12px 20px; margin-bottom: 20px; border-radius: 4px; }
        .flash.success { background: #d4efdf; color: #27ae60; border: 1px solid #27ae60; }
        .flash.error { background: #fadbd8; color: #e74c3c; border: 1px solid #e74c3c; }
        .section-title { font-size: 22px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #c9a96e; }
        .empty-state { text-align: center; padding: 60px; color: #999; font-style: italic; }
        .bulk-actions { margin-bottom: 20px; display: flex; gap: 10px; align-items: center; }
        .filter-bar { margin-bottom: 20px; display: flex; gap: 10px; }
        .filter-bar select, .filter-bar input {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>{{ site_name }}</h1>
            <div class="subtitle">Editorial Dashboard — All the News That's Fit to Mock</div>
        </div>
        <div style="text-align: right; font-size: 14px;">
            <div>{{ current_date }}</div>
        </div>
    </div>
    <div class="nav">
        <a href="/" class="{{ 'active' if filter == 'all' else '' }}">All Articles</a>
        <a href="/?filter=pending" class="{{ 'active' if filter == 'pending' else '' }}">Pending Review</a>
        <a href="/?filter=approved" class="{{ 'active' if filter == 'approved' else '' }}">Approved</a>
        <a href="/?filter=rejected" class="{{ 'active' if filter == 'rejected' else '' }}">Rejected</a>
    </div>
    <div class="container">
        {% for message in get_flashed_messages() %}
        <div class="flash success">{{ message }}</div>
        {% endfor %}
        
        <div class="stats">
            <div class="stat-card">
                <div class="number">{{ total }}</div>
                <div class="label">Total Articles</div>
            </div>
            <div class="stat-card pending">
                <div class="number">{{ pending }}</div>
                <div class="label">Pending Review</div>
            </div>
            <div class="stat-card approved">
                <div class="number">{{ approved }}</div>
                <div class="label">Approved</div>
            </div>
            <div class="stat-card rejected">
                <div class="number">{{ rejected }}</div>
                <div class="label">Rejected</div>
            </div>
        </div>
        
        {% if filter == 'pending' and pending > 0 %}
        <div class="bulk-actions">
            <form action="/bulk-action" method="POST" style="display: flex; gap: 10px;">
                <button type="submit" name="action" value="approve_all" class="btn btn-approve">Approve All Pending</button>
                <button type="submit" name="action" value="reject_all" class="btn btn-reject">Reject All Pending</button>
            </form>
        </div>
        {% endif %}
        
        <h2 class="section-title">
            {% if filter == 'pending' %}Pending Review
            {% elif filter == 'approved' %}Approved Articles
            {% elif filter == 'rejected' %}Rejected Articles
            {% else %}All Articles{% endif %}
        </h2>
        
        <div class="article-list">
            {% if articles %}
                {% for article in articles %}
                <div class="article-card {{ article.status }}">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <h3><a href="/article/{{ article.id }}">{{ article.headline }}</a></h3>
                            <div class="meta">
                                <span class="status-badge {{ article.status }}">{{ article.status }}</span>
                                &nbsp;·&nbsp; Article #{{ article.id }} &nbsp;·&nbsp; {{ article.batch_date }}
                                {% if article.reviewed_at %} &nbsp;·&nbsp; Reviewed: {{ article.reviewed_at }}{% endif %}
                            </div>
                            {% if article.subheadline %}
                            <div class="subheadline">{{ article.subheadline }}</div>
                            {% endif %}
                            <div class="preview">{{ article.body[:250] }}...</div>
                        </div>
                    </div>
                    <div class="actions">
                        <a href="/article/{{ article.id }}" class="btn btn-view">Read Full Article</a>
                        {% if article.status == 'pending' %}
                        <form action="/approve/{{ article.id }}" method="POST" style="display:inline;">
                            <button type="submit" class="btn btn-approve">Approve</button>
                        </form>
                        <form action="/reject/{{ article.id }}" method="POST" style="display:inline;">
                            <button type="submit" class="btn btn-reject">Reject</button>
                        </form>
                        {% elif article.status != 'pending' %}
                        <form action="/reset/{{ article.id }}" method="POST" style="display:inline;">
                            <button type="submit" class="btn btn-reset">Reset to Pending</button>
                        </form>
                        {% endif %}
                    </div>
                </div>
                {% endfor %}
            {% else %}
                <div class="empty-state">
                    <p>No articles found{% if filter != 'all' %} with status "{{ filter }}"{% endif %}.</p>
                    <p>Run the workflow to generate new articles.</p>
                </div>
            {% endif %}
        </div>
    </div>
</body>
</html>
"""

ARTICLE_DETAIL_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ article.headline }} - {{ site_name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', serif; background: #f5f0eb; color: #2c2c2c; line-height: 1.8; }
        .header {
            background: #1a1a2e; color: #e8d5b7; padding: 20px 40px;
            border-bottom: 4px solid #c9a96e;
        }
        .header h1 { font-size: 24px; letter-spacing: 2px; }
        .header a { color: #e8d5b7; text-decoration: none; }
        .container { max-width: 800px; margin: 30px auto; padding: 0 20px; }
        .back-link { margin-bottom: 20px; }
        .back-link a { color: #c9a96e; text-decoration: none; font-size: 14px; }
        .article-full {
            background: white; border-radius: 8px; padding: 40px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        .article-full h2 { font-size: 32px; line-height: 1.3; margin-bottom: 10px; }
        .article-full .subheadline { font-size: 18px; font-style: italic; color: #666; margin-bottom: 20px; }
        .article-full .meta { font-size: 13px; color: #888; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
        .article-full .body { font-size: 17px; }
        .article-full .body p { margin-bottom: 16px; }
        .source-info {
            background: #f8f4ef; border-radius: 8px; padding: 20px; margin-top: 25px;
            border: 1px solid #e8d5b7;
        }
        .source-info h4 { color: #c9a96e; margin-bottom: 10px; }
        .source-info p { font-size: 14px; color: #666; }
        .source-info a { color: #3498db; }
        .actions {
            margin-top: 25px; display: flex; gap: 10px; padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .btn {
            padding: 10px 24px; border: none; border-radius: 4px;
            cursor: pointer; font-size: 15px; font-weight: bold;
        }
        .btn-approve { background: #27ae60; color: white; }
        .btn-reject { background: #e74c3c; color: white; }
        .btn-reset { background: #95a5a6; color: white; }
        .status-badge {
            display: inline-block; padding: 4px 12px; border-radius: 12px;
            font-size: 13px; font-weight: bold; text-transform: uppercase;
        }
        .status-badge.pending { background: #ffeaa7; color: #e67e22; }
        .status-badge.approved { background: #d4efdf; color: #27ae60; }
        .status-badge.rejected { background: #fadbd8; color: #e74c3c; }
        .rejection-form { margin-top: 15px; }
        .rejection-form textarea {
            width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;
            font-family: inherit; font-size: 14px; resize: vertical; min-height: 80px;
        }
        .media-section { margin-top: 25px; }
        .media-section img { max-width: 100%; border-radius: 8px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1><a href="/">{{ site_name }}</a></h1>
    </div>
    <div class="container">
        <div class="back-link"><a href="/">← Back to Dashboard</a></div>
        
        {% for message in get_flashed_messages() %}
        <div style="padding: 12px 20px; margin-bottom: 20px; border-radius: 4px; background: #d4efdf; color: #27ae60; border: 1px solid #27ae60;">{{ message }}</div>
        {% endfor %}
        
        <div class="article-full">
            <span class="status-badge {{ article.status }}">{{ article.status }}</span>
            <h2 style="margin-top: 15px;">{{ article.headline }}</h2>
            {% if article.subheadline %}
            <div class="subheadline">{{ article.subheadline }}</div>
            {% endif %}
            <div class="meta">
                Article #{{ article.id }} &nbsp;·&nbsp; Batch: {{ article.batch_date }} &nbsp;·&nbsp; Created: {{ article.created_at }}
                {% if article.reviewed_at %} &nbsp;·&nbsp; Reviewed: {{ article.reviewed_at }}{% endif %}
            </div>
            <div class="body">
                {% for paragraph in article.body.split('\\n\\n') %}
                    {% if paragraph.strip() %}
                    <p>{{ paragraph.strip() }}</p>
                    {% endif %}
                {% endfor %}
            </div>
            
            {% if article.news_title %}
            <div class="source-info">
                <h4>Original News Source</h4>
                <p><strong>{{ article.news_title }}</strong></p>
                <p>{{ article.news_summary[:300] if article.news_summary else '' }}</p>
                <p>Source: {{ article.news_source }} 
                    {% if article.news_url %}<a href="{{ article.news_url }}" target="_blank">View Original</a>{% endif %}
                </p>
            </div>
            {% endif %}
            
            {% if article.rejection_reason %}
            <div style="background: #fadbd8; border-radius: 8px; padding: 15px; margin-top: 20px; border: 1px solid #e74c3c;">
                <strong style="color: #e74c3c;">Rejection Reason:</strong>
                <p>{{ article.rejection_reason }}</p>
            </div>
            {% endif %}
            
            {% if media %}
            <div class="media-section">
                <h4 style="color: #c9a96e; margin-bottom: 10px;">Generated Media</h4>
                {% for m in media %}
                    {% if m.media_type == 'image' and m.file_path %}
                    <img src="/media/{{ m.file_path }}" alt="Article illustration">
                    {% endif %}
                {% endfor %}
            </div>
            {% endif %}
            
            <div class="actions">
                {% if article.status == 'pending' %}
                <form action="/approve/{{ article.id }}" method="POST">
                    <button type="submit" class="btn btn-approve">Approve for Publication</button>
                </form>
                <div class="rejection-form">
                    <form action="/reject/{{ article.id }}" method="POST">
                        <textarea name="reason" placeholder="Optional: reason for rejection..."></textarea>
                        <button type="submit" class="btn btn-reject" style="margin-top: 8px;">Reject</button>
                    </form>
                </div>
                {% else %}
                <form action="/reset/{{ article.id }}" method="POST">
                    <button type="submit" class="btn btn-reset">Reset to Pending</button>
                </form>
                {% endif %}
            </div>
        </div>
    </div>
</body>
</html>
"""


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.route("/")
def dashboard():
    """Main dashboard view."""
    filter_status = request.args.get("filter", "all")
    
    if filter_status == "all":
        articles = get_all_articles()
    else:
        articles = get_articles_by_status(filter_status)
    
    all_articles = get_all_articles()
    pending_count = len([a for a in all_articles if a["status"] == "pending"])
    approved_count = len([a for a in all_articles if a["status"] == "approved"])
    rejected_count = len([a for a in all_articles if a["status"] == "rejected"])
    
    return render_template_string(
        DASHBOARD_TEMPLATE,
        site_name=SITE_NAME,
        articles=articles,
        filter=filter_status,
        total=len(all_articles),
        pending=pending_count,
        approved=approved_count,
        rejected=rejected_count,
        current_date=datetime.now().strftime("%B %d, %Y"),
    )


@app.route("/article/<int:article_id>")
def article_detail(article_id):
    """View a single article in detail."""
    article = get_article_with_news(article_id)
    if not article:
        return "Article not found", 404
    
    media = get_media_for_article(article_id)
    
    return render_template_string(
        ARTICLE_DETAIL_TEMPLATE,
        site_name=SITE_NAME,
        article=article,
        media=media,
    )


@app.route("/approve/<int:article_id>", methods=["POST"])
def approve_article(article_id):
    """Approve an article."""
    update_article_status(article_id, "approved")
    flash(f"Article #{article_id} approved for publication!")
    referrer = request.referrer or "/"
    return redirect(referrer)


@app.route("/reject/<int:article_id>", methods=["POST"])
def reject_article(article_id):
    """Reject an article."""
    reason = request.form.get("reason", "")
    update_article_status(article_id, "rejected", reason)
    flash(f"Article #{article_id} rejected.")
    referrer = request.referrer or "/"
    return redirect(referrer)


@app.route("/reset/<int:article_id>", methods=["POST"])
def reset_article(article_id):
    """Reset an article back to pending."""
    update_article_status(article_id, "pending")
    flash(f"Article #{article_id} reset to pending.")
    referrer = request.referrer or "/"
    return redirect(referrer)


@app.route("/bulk-action", methods=["POST"])
def bulk_action():
    """Perform bulk actions on pending articles."""
    action = request.form.get("action")
    pending = get_articles_by_status("pending")
    
    if action == "approve_all":
        for article in pending:
            update_article_status(article["id"], "approved")
        flash(f"Approved {len(pending)} articles!")
    elif action == "reject_all":
        for article in pending:
            update_article_status(article["id"], "rejected", "Bulk rejection")
        flash(f"Rejected {len(pending)} articles.")
    
    return redirect("/")


# ─── API Endpoints ───────────────────────────────────────────────────────────

@app.route("/api/articles")
def api_articles():
    """API: Get all articles."""
    articles = get_all_articles()
    return jsonify(articles)


@app.route("/api/articles/<status>")
def api_articles_by_status(status):
    """API: Get articles by status."""
    articles = get_articles_by_status(status)
    return jsonify(articles)


@app.route("/api/approve/<int:article_id>", methods=["POST"])
def api_approve(article_id):
    """API: Approve an article."""
    update_article_status(article_id, "approved")
    return jsonify({"status": "approved", "article_id": article_id})


@app.route("/api/reject/<int:article_id>", methods=["POST"])
def api_reject(article_id):
    """API: Reject an article."""
    data = request.get_json() or {}
    reason = data.get("reason", "")
    update_article_status(article_id, "rejected", reason)
    return jsonify({"status": "rejected", "article_id": article_id})


def run_dashboard():
    """Start the approval dashboard."""
    init_db()
    print(f"\n{'='*60}")
    print(f"APPROVAL DASHBOARD")
    print(f"{'='*60}")
    print(f"  Running at http://{DASHBOARD_HOST}:{DASHBOARD_PORT}")
    print(f"  Press Ctrl+C to stop")
    app.run(host=DASHBOARD_HOST, port=DASHBOARD_PORT, debug=False)


if __name__ == "__main__":
    run_dashboard()
