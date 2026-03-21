"""
Database module for the Satirical News Workflow.
Uses SQLite for lightweight, file-based persistence.
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DB_PATH


def get_connection():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS news_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            summary TEXT,
            source TEXT,
            source_url TEXT,
            published_date TEXT,
            fetched_at TEXT DEFAULT (datetime('now')),
            batch_date TEXT,
            UNIQUE(title, source)
        );

        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            news_event_id INTEGER,
            headline TEXT NOT NULL,
            subheadline TEXT,
            body TEXT NOT NULL,
            slug TEXT UNIQUE,
            status TEXT DEFAULT 'pending',  -- pending, approved, rejected
            rejection_reason TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            reviewed_at TEXT,
            batch_date TEXT,
            FOREIGN KEY (news_event_id) REFERENCES news_events(id)
        );

        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER NOT NULL,
            media_type TEXT NOT NULL,  -- image, video
            file_path TEXT,
            prompt_used TEXT,
            status TEXT DEFAULT 'pending',  -- pending, generated, failed
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (article_id) REFERENCES articles(id)
        );

        CREATE TABLE IF NOT EXISTS publications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER NOT NULL,
            channel TEXT NOT NULL,  -- website, twitter, facebook, linkedin, instagram
            published_url TEXT,
            status TEXT DEFAULT 'pending',  -- pending, published, failed
            published_at TEXT,
            FOREIGN KEY (article_id) REFERENCES articles(id)
        );

        CREATE TABLE IF NOT EXISTS workflow_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_date TEXT NOT NULL,
            stage TEXT NOT NULL,  -- gathering, generation, approval, media, website, social
            status TEXT DEFAULT 'running',  -- running, completed, failed
            started_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT,
            details TEXT
        );
    """)

    conn.commit()
    conn.close()


# ─── News Events ─────────────────────────────────────────────────────────────

def insert_news_event(title, summary, source, source_url, published_date, batch_date):
    """Insert a news event, ignoring duplicates."""
    conn = get_connection()
    try:
        conn.execute(
            """INSERT OR IGNORE INTO news_events 
               (title, summary, source, source_url, published_date, batch_date)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (title, summary, source, source_url, published_date, batch_date)
        )
        conn.commit()
    finally:
        conn.close()


def get_news_events_by_date(batch_date):
    """Get all news events for a specific batch date."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM news_events WHERE batch_date = ? ORDER BY id",
            (batch_date,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ─── Articles ────────────────────────────────────────────────────────────────

def insert_article(news_event_id, headline, subheadline, body, slug, batch_date):
    """Insert a generated article."""
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO articles 
               (news_event_id, headline, subheadline, body, slug, batch_date)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (news_event_id, headline, subheadline, body, slug, batch_date)
        )
        conn.commit()
    finally:
        conn.close()


def get_articles_by_status(status, batch_date=None):
    """Get articles by their approval status."""
    conn = get_connection()
    try:
        if batch_date:
            rows = conn.execute(
                "SELECT * FROM articles WHERE status = ? AND batch_date = ? ORDER BY id",
                (status, batch_date)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM articles WHERE status = ? ORDER BY id DESC",
                (status,)
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_all_articles(batch_date=None):
    """Get all articles, optionally filtered by batch date."""
    conn = get_connection()
    try:
        if batch_date:
            rows = conn.execute(
                "SELECT * FROM articles WHERE batch_date = ? ORDER BY id",
                (batch_date,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM articles ORDER BY id DESC"
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_article_status(article_id, status, rejection_reason=None):
    """Update an article's approval status."""
    conn = get_connection()
    try:
        conn.execute(
            """UPDATE articles 
               SET status = ?, rejection_reason = ?, reviewed_at = datetime('now')
               WHERE id = ?""",
            (status, rejection_reason, article_id)
        )
        conn.commit()
    finally:
        conn.close()


def get_article_by_id(article_id):
    """Get a single article by ID."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM articles WHERE id = ?", (article_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_article_with_news(article_id):
    """Get an article with its associated news event."""
    conn = get_connection()
    try:
        row = conn.execute(
            """SELECT a.*, n.title as news_title, n.summary as news_summary, 
                      n.source as news_source, n.source_url as news_url
               FROM articles a
               LEFT JOIN news_events n ON a.news_event_id = n.id
               WHERE a.id = ?""",
            (article_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


# ─── Media ───────────────────────────────────────────────────────────────────

def insert_media(article_id, media_type, prompt_used=None):
    """Insert a media record."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            """INSERT INTO media (article_id, media_type, prompt_used)
               VALUES (?, ?, ?)""",
            (article_id, media_type, prompt_used)
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def update_media(media_id, file_path=None, status=None):
    """Update a media record."""
    conn = get_connection()
    try:
        if file_path and status:
            conn.execute(
                "UPDATE media SET file_path = ?, status = ? WHERE id = ?",
                (file_path, status, media_id)
            )
        elif status:
            conn.execute(
                "UPDATE media SET status = ? WHERE id = ?",
                (status, media_id)
            )
        conn.commit()
    finally:
        conn.close()


def get_media_for_article(article_id):
    """Get all media for an article."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM media WHERE article_id = ? ORDER BY media_type",
            (article_id,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ─── Publications ────────────────────────────────────────────────────────────

def insert_publication(article_id, channel):
    """Insert a publication record."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO publications (article_id, channel) VALUES (?, ?)",
            (article_id, channel)
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def update_publication(pub_id, status, published_url=None):
    """Update a publication record."""
    conn = get_connection()
    try:
        conn.execute(
            """UPDATE publications 
               SET status = ?, published_url = ?, published_at = datetime('now')
               WHERE id = ?""",
            (status, published_url, pub_id)
        )
        conn.commit()
    finally:
        conn.close()


def get_publications_for_article(article_id):
    """Get all publications for an article."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM publications WHERE article_id = ?",
            (article_id,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# ─── Workflow Runs ───────────────────────────────────────────────────────────

def log_workflow_run(batch_date, stage, status="running", details=None):
    """Log a workflow run."""
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO workflow_runs (batch_date, stage, status, details) VALUES (?, ?, ?, ?)",
            (batch_date, stage, status, details)
        )
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def update_workflow_run(run_id, status, details=None):
    """Update a workflow run status."""
    conn = get_connection()
    try:
        conn.execute(
            """UPDATE workflow_runs 
               SET status = ?, completed_at = datetime('now'), details = ?
               WHERE id = ?""",
            (status, details, run_id)
        )
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
