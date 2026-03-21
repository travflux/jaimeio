#!/usr/bin/env python3
"""
Reddit Auto-Poster using PRAW
Standalone script that can be called from Node.js to post articles to Reddit
"""

import praw
import sys
import json
import os
from datetime import datetime

def post_to_reddit(
    client_id: str,
    client_secret: str,
    username: str,
    password: str,
    user_agent: str,
    subreddit_name: str,
    title: str,
    url: str = None,
    selftext: str = None
) -> dict:
    """
    Post to Reddit using PRAW
    
    Args:
        client_id: Reddit app client ID
        client_secret: Reddit app client secret
        username: Reddit username
        password: Reddit password (can include 2FA: "password:123456")
        user_agent: User agent string
        subreddit_name: Target subreddit (without r/)
        title: Post title
        url: Link URL (for link posts)
        selftext: Post body (for text posts)
    
    Returns:
        dict with success status and post URL or error message
    """
    try:
        # Initialize Reddit instance
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent,
            username=username,
            password=password
        )
        
        # Get subreddit
        subreddit = reddit.subreddit(subreddit_name)
        
        # Submit post
        if url:
            # Link post
            submission = subreddit.submit(
                title=title,
                url=url
            )
        else:
            # Text post
            submission = subreddit.submit(
                title=title,
                selftext=selftext or ""
            )
        
        return {
            "success": True,
            "post_url": f"https://reddit.com{submission.permalink}",
            "post_id": submission.id
        }
        
    except praw.exceptions.RedditAPIException as e:
        error_msg = str(e)
        if "RATELIMIT" in error_msg:
            return {
                "success": False,
                "error": "Rate limit exceeded. Please wait before posting again."
            }
        elif "SUBREDDIT_NOEXIST" in error_msg:
            return {
                "success": False,
                "error": f"Subreddit r/{subreddit_name} does not exist."
            }
        else:
            return {
                "success": False,
                "error": f"Reddit API error: {error_msg}"
            }
    except praw.exceptions.InvalidToken:
        return {
            "success": False,
            "error": "Invalid Reddit credentials. Check client_id and client_secret."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        }

def main():
    """
    Main entry point - reads JSON from stdin and posts to Reddit
    Expected JSON format:
    {
        "client_id": "...",
        "client_secret": "...",
        "username": "...",
        "password": "...",
        "user_agent": "...",
        "subreddit": "...",
        "title": "...",
        "url": "..." (optional),
        "selftext": "..." (optional)
    }
    """
    try:
        # Read JSON from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Validate required fields
        required_fields = ["client_id", "client_secret", "username", "password", "subreddit", "title"]
        missing_fields = [f for f in required_fields if f not in input_data]
        if missing_fields:
            result = {
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }
            print(json.dumps(result))
            sys.exit(1)
        
        # Set default user agent if not provided
        if "user_agent" not in input_data:
            input_data["user_agent"] = "HambryBot/1.0 (Satirical News Poster)"
        
        # Post to Reddit
        result = post_to_reddit(
            client_id=input_data["client_id"],
            client_secret=input_data["client_secret"],
            username=input_data["username"],
            password=input_data["password"],
            user_agent=input_data["user_agent"],
            subreddit_name=input_data["subreddit"],
            title=input_data["title"],
            url=input_data.get("url"),
            selftext=input_data.get("selftext")
        )
        
        # Output result as JSON
        print(json.dumps(result))
        sys.exit(0 if result["success"] else 1)
        
    except json.JSONDecodeError:
        result = {
            "success": False,
            "error": "Invalid JSON input"
        }
        print(json.dumps(result))
        sys.exit(1)
    except Exception as e:
        result = {
            "success": False,
            "error": f"Script error: {str(e)}"
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
