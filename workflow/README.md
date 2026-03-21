# The Daily Satirist: Automated Satirical News Workflow

**Author:** Manus AI
**Version:** 1.0
**Date:** 2026-02-16

## 1. Project Overview

This project provides a complete, end-to-end automated workflow for creating and publishing a daily satirical news publication. The system is designed to be a powerful tool for content creators, automating the entire pipeline from news gathering to multi-channel distribution.

The workflow performs the following steps:

1.  **News Gathering:** Fetches recent news events from a configurable list of RSS feeds.
2.  **Satirical Article Generation:** Uses AI to write humorous, satirical articles based on the real news events.
3.  **Approval Process:** Provides a web-based dashboard for an editor to review, approve, or reject the generated articles.
4.  **Media Generation:** For each approved article, automatically generates a relevant satirical image and a short video clip suitable for social media.
5.  **Website Distribution:** Builds a static, newspaper-style website with the approved articles.
6.  **Social Media Distribution:** Generates platform-specific posts for approved articles and can either publish them directly via the Buffer API or create a manual posting queue.

## 2. Features

*   **Fully Automated:** The entire workflow is orchestrated by a single Python script, designed to be run on a daily schedule.
*   **AI-Powered Content Creation:** Leverages powerful language models for generating high-quality satirical articles, images, and social media copy.
*   **Human-in-the-Loop Approval:** Includes a user-friendly web dashboard for editorial control, ensuring that only approved content is published.
*   **Multi-Channel Distribution:** Publishes content to a dedicated website and prepares posts for major social media platforms.
*   **Highly Customizable:** All aspects of the workflow, from news sources to AI models and website templates, are easily configurable.
*   **Modular Architecture:** The system is built with a modular design, making it easy to extend or modify individual components.

## 3. System Architecture

The workflow is built around a central Python orchestrator that calls a series of specialized modules. The key components are:

| Module | Technology | Description |
| :--- | :--- | :--- |
| **Orchestrator** | Python (`argparse`) | The main script (`run_workflow.py`) that manages the entire process. |
| **News Gathering** | Python (`feedparser`) | Fetches and deduplicates news from RSS feeds. |
| **Article Generation** | OpenAI API | Generates satirical articles from news events. |
| **Approval Dashboard** | Flask | A web application for reviewing and managing articles. |
| **Media Generation** | OpenAI API, FFmpeg | Creates satirical images and simple animated videos. |
| **Website Publisher** | Jinja2 | Generates a static HTML/CSS website. |
| **Social Distributor** | Buffer API / Manual Queue | Prepares and distributes content for social media. |
| **Database** | SQLite | A lightweight, file-based database for storing all workflow data. |

## 4. Setup and Installation

### Prerequisites

*   Python 3.8+
*   `pip` for package installation
*   `ffmpeg` for video generation (`sudo apt-get install ffmpeg` on Debian/Ubuntu)
*   An OpenAI API key

### Installation

1.  **Clone the repository or extract the project files.**

2.  **Install Python dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

    *(Note: A `requirements.txt` file can be generated from the installed packages. For this project, the dependencies are `feedparser`, `gnews`, `openai`, `aiohttp`, `jinja2`, `python-slugify`, `flask` and `requests`)*

3.  **Configure the workflow:**

    Open `config.py` and edit the settings. The most important setting is your OpenAI API key, which should be set as an environment variable:

    ```bash
    export OPENAI_API_KEY="your-openai-api-key"
    ```

    You can also configure:

    *   `RSS_FEEDS`: Add or remove RSS feeds for news gathering.
    *   `TARGET_NEWS_COUNT`: The number of news events to process each day.
    *   `SITE_NAME`, `SITE_TAGLINE`: Customize your publication's branding.
    *   `BUFFER_ACCESS_TOKEN`: If you want to use Buffer for automated social media posting, add your access token as an environment variable.

## 5. How to Use the Workflow

The main script `run_workflow.py` is the entry point for all operations.

### Running the Full Workflow (Step-by-Step)

This is the recommended way to run the workflow daily.

**Step 1: Gather News and Generate Articles**

Run the `full` command to fetch news and generate the initial set of satirical articles.

```bash
python run_workflow.py full
```

This will populate the database with articles that have a `pending` status.

**Step 2: Approve Articles**

Launch the approval dashboard:

```bash
python run_workflow.py dashboard
```

Open your web browser to `http://localhost:5000`. Here you can review each article, approve the ones you like, and reject the others.

**Step 3: Generate Media**

Once you have approved some articles, run the `media` command to generate images and videos for them.

```bash
python run_workflow.py media
```

**Step 4: Publish**

Finally, run the `publish` command to build the website and prepare the social media posts.

```bash
python run_workflow.py publish
```

This will:
*   Generate the static website in the `output/website/{current_date}` directory.
*   If `BUFFER_ACCESS_TOKEN` is set, it will post to your connected Buffer profiles.
*   If not, it will create a markdown file (`data/social_media_queue_{current_date}.md`) with the generated posts for you to copy and paste manually.

### Running Individual Stages

You can also run each stage of the workflow independently:

*   `python run_workflow.py gather`: Fetch news events.
*   `python run_workflow.py generate`: Generate articles for the fetched events.
*   `python run_workflow.py dashboard`: Launch the approval dashboard.
*   `python run_workflow.py media`: Generate media for approved articles.
*   `python run_workflow.py website`: Build the static website.
*   `python run_workflow.py social`: Prepare social media posts.
*   `python run_workflow.py status`: Show the current status of the workflow.

## 6. Project Structure

```
/satirical_news_workflow
├── modules/                # Core logic for each workflow stage
│   ├── __init__.py
│   ├── article_generator.py
│   ├── approval_dashboard.py
│   ├── database.py
│   ├── media_generator.py
│   ├── news_gatherer.py
│   ├── social_distributor.py
│   └── website_publisher.py
├── data/                   # Database file and other data
├── output/                 # Generated articles, media, and website
│   ├── articles/
│   ├── images/
│   ├── videos/
│   └── website/
├── static/                 # Static assets for the website (if needed)
├── templates/              # HTML templates for the website (if needed)
├── config.py               # All configuration settings
├── run_workflow.py         # Main orchestrator script
└── README.md               # This file
```

## 7. Customization

*   **News Sources:** Edit the `RSS_FEEDS` list in `config.py` to change the news sources.
*   **Satirical Style:** Modify the `SATIRE_SYSTEM_PROMPT` in `modules/article_generator.py` to change the writing style of the AI.
*   **Website Appearance:** The CSS for the website is located in the `SITE_CSS` variable in `modules/website_publisher.py`. You can edit this directly or move it to a separate `.css` file in the `static` directory.
*   **Website Templates:** The HTML templates for the index and article pages are also in `modules/website_publisher.py`. For more complex changes, you can move these to separate `.html` files in the `templates` directory and adjust the Jinja2 environment in `website_publisher.py` to load from the filesystem.
