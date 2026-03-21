#!/usr/bin/env python3
"""
mirror-sync.py — Copies satire-news engine to the saas clone directory.
Used by push-saas-release.sh when rsync is not available.

Environment variables (set by push-saas-release.sh):
  ENGINE_REPO_DIR  — source directory (default: /home/ubuntu/satire-news)
  SAAS_REPO_DIR    — destination directory (default: /tmp/satire-news-saas-release)
"""
import os
import shutil
import sys

# Allow override via environment variables (used by push-saas-release.sh)
src = os.environ.get('ENGINE_REPO_DIR', '/home/ubuntu/satire-news')
dst = os.environ.get('SAAS_REPO_DIR', '/tmp/satire-news-saas-release')

# Directories and files to exclude from the mirror
EXCLUDE = {
    '.git',
    'node_modules',
    'dist',
    '.manus-logs',
    '.manus',
    '.webdev',
    'test-results',
}

def should_exclude(name: str) -> bool:
    if name in EXCLUDE:
        return True
    if name.endswith('.log'):
        return True
    return False

if not os.path.isdir(src):
    print(f"ERROR: Source directory not found: {src}", file=sys.stderr)
    sys.exit(1)

if not os.path.isdir(dst):
    print(f"ERROR: Destination directory not found: {dst}", file=sys.stderr)
    sys.exit(1)

count = 0
errors = 0
for item in os.listdir(src):
    if should_exclude(item):
        continue
    s = os.path.join(src, item)
    d = os.path.join(dst, item)
    try:
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
        count += 1
    except Exception as e:
        print(f"  WARN: Could not copy {item}: {e}", file=sys.stderr)
        errors += 1

print(f"Mirror sync complete. {count} items copied, {errors} warnings.")
print(f"Items in dst: {len(os.listdir(dst))}")

if errors > 0:
    sys.exit(1)
