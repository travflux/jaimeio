#!/usr/bin/env python3
"""
The Daily Satirist - Main Workflow Orchestrator
================================================

This script orchestrates the complete daily workflow:
1. Gather news events from RSS feeds
2. Generate satirical articles using AI
3. Launch the approval dashboard for editorial review
4. Generate media (images + videos) for approved articles
5. Build and publish the website
6. Distribute to social media channels

Usage:
    python run_workflow.py                    # Run the full workflow
    python run_workflow.py gather             # Only gather news
    python run_workflow.py generate           # Only generate articles
    python run_workflow.py dashboard          # Launch approval dashboard
    python run_workflow.py media              # Generate media for approved articles
    python run_workflow.py publish            # Publish website + social media
    python run_workflow.py website            # Only generate website
    python run_workflow.py social             # Only distribute to social media
    python run_workflow.py status             # Show workflow status
"""

import sys
import os
import argparse
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from config import *
from modules.database import (
    init_db, get_news_events_by_date, get_all_articles,
    get_articles_by_status, log_workflow_run, update_workflow_run
)


def print_banner():
    """Print the application banner."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              THE DAILY SATIRIST                              ║
║              All the News That's Fit to Mock                 ║
║                                                              ║
║              Automated Satirical News Workflow                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)


def show_status(batch_date):
    """Show the current workflow status."""
    print(f"\n{'='*60}")
    print(f"WORKFLOW STATUS - {batch_date}")
    print(f"{'='*60}")
    
    events = get_news_events_by_date(batch_date)
    all_articles = get_all_articles(batch_date)
    pending = get_articles_by_status("pending", batch_date)
    approved = get_articles_by_status("approved", batch_date)
    rejected = get_articles_by_status("rejected", batch_date)
    
    print(f"""
  News Events:      {len(events)}
  Articles Total:   {len(all_articles)}
    Pending:        {len(pending)}
    Approved:       {len(approved)}
    Rejected:       {len(rejected)}
    """)
    
    if all_articles:
        print("  Recent Articles:")
        for a in all_articles[:10]:
            status_icon = {"pending": "⏳", "approved": "✅", "rejected": "❌"}.get(a["status"], "?")
            print(f"    {status_icon} [{a['id']}] {a['headline'][:60]}")


def run_gather(batch_date):
    """Run the news gathering stage."""
    from modules.news_gatherer import gather_news
    
    run_id = log_workflow_run(batch_date, "gathering")
    try:
        events = gather_news(batch_date)
        update_workflow_run(run_id, "completed", f"Gathered {len(events)} events")
        return events
    except Exception as e:
        update_workflow_run(run_id, "failed", str(e))
        print(f"Error in news gathering: {e}")
        raise


def run_generate(batch_date):
    """Run the article generation stage."""
    from modules.article_generator import generate_all_articles
    
    run_id = log_workflow_run(batch_date, "generation")
    try:
        articles = generate_all_articles(batch_date)
        update_workflow_run(run_id, "completed", f"Generated {len(articles)} articles")
        return articles
    except Exception as e:
        update_workflow_run(run_id, "failed", str(e))
        print(f"Error in article generation: {e}")
        raise


def run_dashboard():
    """Launch the approval dashboard."""
    from modules.approval_dashboard import run_dashboard
    run_dashboard()


def run_media(batch_date):
    """Run the media generation stage."""
    from modules.media_generator import generate_media_for_approved
    
    run_id = log_workflow_run(batch_date, "media")
    try:
        results = generate_media_for_approved(batch_date)
        update_workflow_run(run_id, "completed", f"Generated media for {len(results)} articles")
        return results
    except Exception as e:
        update_workflow_run(run_id, "failed", str(e))
        print(f"Error in media generation: {e}")
        raise


def run_website(batch_date):
    """Run the website generation stage."""
    from modules.website_publisher import generate_website
    
    run_id = log_workflow_run(batch_date, "website")
    try:
        site_path = generate_website(batch_date)
        update_workflow_run(run_id, "completed", f"Website at {site_path}")
        return site_path
    except Exception as e:
        update_workflow_run(run_id, "failed", str(e))
        print(f"Error in website generation: {e}")
        raise


def run_social(batch_date):
    """Run the social media distribution stage."""
    from modules.social_distributor import distribute_to_social_media
    
    run_id = log_workflow_run(batch_date, "social")
    try:
        results = distribute_to_social_media(batch_date)
        update_workflow_run(run_id, "completed", f"Distributed {len(results)} articles")
        return results
    except Exception as e:
        update_workflow_run(run_id, "failed", str(e))
        print(f"Error in social distribution: {e}")
        raise


def run_publish(batch_date):
    """Run both website and social media distribution."""
    site_path = run_website(batch_date)
    social_results = run_social(batch_date)
    return site_path, social_results


def run_full_workflow(batch_date):
    """Run the complete workflow (except approval, which is manual)."""
    print_banner()
    print(f"Starting full workflow for {batch_date}...")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Stage 1: Gather news
    print("\n" + "="*60)
    print("STAGE 1: NEWS GATHERING")
    print("="*60)
    events = run_gather(batch_date)
    
    # Stage 2: Generate articles
    print("\n" + "="*60)
    print("STAGE 2: ARTICLE GENERATION")
    print("="*60)
    articles = run_generate(batch_date)
    
    # Stage 3: Approval (manual)
    print("\n" + "="*60)
    print("STAGE 3: APPROVAL (MANUAL)")
    print("="*60)
    print(f"""
  Articles are ready for review!
  
  To review and approve articles, run:
    python run_workflow.py dashboard
  
  Then open http://localhost:{DASHBOARD_PORT} in your browser.
  
  After approving articles, run the remaining stages:
    python run_workflow.py media      # Generate images & videos
    python run_workflow.py publish    # Publish to website & social media
    """)
    
    show_status(batch_date)
    
    return {
        "batch_date": batch_date,
        "events": len(events),
        "articles": len(articles),
        "status": "awaiting_approval",
    }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="The Daily Satirist - Automated Satirical News Workflow"
    )
    parser.add_argument(
        "command",
        nargs="?",
        default="full",
        choices=["full", "gather", "generate", "dashboard", "media", "publish", "website", "social", "status"],
        help="Workflow stage to run (default: full)"
    )
    parser.add_argument(
        "--date",
        default=datetime.now().strftime("%Y-%m-%d"),
        help="Batch date (default: today)"
    )
    
    args = parser.parse_args()
    batch_date = args.date
    
    # Initialize database
    init_db()
    
    # Route to the appropriate function
    commands = {
        "full": lambda: run_full_workflow(batch_date),
        "gather": lambda: run_gather(batch_date),
        "generate": lambda: run_generate(batch_date),
        "dashboard": run_dashboard,
        "media": lambda: run_media(batch_date),
        "publish": lambda: run_publish(batch_date),
        "website": lambda: run_website(batch_date),
        "social": lambda: run_social(batch_date),
        "status": lambda: show_status(batch_date),
    }
    
    try:
        result = commands[args.command]()
        if args.command != "dashboard":
            print(f"\n✓ Command '{args.command}' completed successfully.")
    except KeyboardInterrupt:
        print("\n\nWorkflow interrupted by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
