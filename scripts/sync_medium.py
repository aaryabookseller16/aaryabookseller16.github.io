#!/usr/bin/env python3
"""Pull Medium posts into the site.

Fetches the Medium RSS feed, merges new posts into data/posts.json (the store of
record: RSS only carries the latest ~10 posts, and hand edits must survive), then
renders the post list into blog.html and the latest posts into index.html,
between the <!-- posts:*:start --> / <!-- posts:*:end --> markers.

Usage:
    python3 scripts/sync_medium.py              # fetch + write
    python3 scripts/sync_medium.py --dry-run    # show what would change
    python3 scripts/sync_medium.py --offline    # re-render from posts.json only
"""

import argparse
import html
import json
import math
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

MEDIUM_USER = "aaryacodes"
FEED_URL = f"https://medium.com/feed/@{MEDIUM_USER}"
PROFILE_URL = f"https://medium.com/@{MEDIUM_USER}"

ROOT = Path(__file__).resolve().parent.parent
POSTS_JSON = ROOT / "data" / "posts.json"
BLOG_HTML = ROOT / "blog.html"
INDEX_HTML = ROOT / "index.html"

RECENT_COUNT = 3
EXCERPT_CHARS = 220
WORDS_PER_MINUTE = 238

NS = {"content": "http://purl.org/rss/1.0/modules/content/"}
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ── Fetch + parse ────────────────────────────────────────────────────────────

def fetch_feed() -> bytes:
    # Medium answers 403 to the default urllib User-Agent.
    req = urllib.request.Request(FEED_URL, headers={"User-Agent": "Mozilla/5.0 (site sync script)"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def plain_text(fragment: str) -> str:
    text = re.sub(r"<(figure|figcaption)[^>]*>.*?</\1>", " ", fragment, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return " ".join(html.unescape(text).split())


def make_excerpt(text: str) -> str:
    if len(text) <= EXCERPT_CHARS:
        return text
    cut = text[:EXCERPT_CHARS].rsplit(" ", 1)[0].rstrip(",;:.")
    return cut + "…"


def parse_feed(xml_bytes: bytes) -> list[dict]:
    channel = ET.fromstring(xml_bytes).find("channel")
    posts = []
    for item in channel.findall("item"):
        body = item.findtext("content:encoded", default="", namespaces=NS)
        img = re.search(r'<img[^>]+src="([^"]+)"', body)
        text = plain_text(body)
        posts.append({
            "title": item.findtext("title", "").strip(),
            "url": item.findtext("link", "").split("?")[0],
            "date": parsedate_to_datetime(item.findtext("pubDate")).strftime("%Y-%m-%d"),
            "excerpt": make_excerpt(text),
            "image": img.group(1) if img else "",
            "tags": [c.text for c in item.findall("category") if c.text],
            "readMinutes": max(1, math.ceil(len(text.split()) / WORDS_PER_MINUTE)),
        })
    return posts


def merge(existing: list[dict], fetched: list[dict]) -> list[dict]:
    """Keep every stored post and its hand-edited fields; add posts not yet stored."""
    by_url = {p["url"]: p for p in existing}
    for post in fetched:
        by_url.setdefault(post["url"], post)
    return sorted(by_url.values(), key=lambda p: p["date"], reverse=True)


# ── Render ───────────────────────────────────────────────────────────────────

def esc(value) -> str:
    return html.escape(str(value), quote=True)


def month_year(date: str) -> str:
    year, month, _ = date.split("-")
    return f"{MONTHS[int(month) - 1]} {year}"


def display_date(date: str) -> str:
    return date.replace("-", "/")


def tag_label(tag: str) -> str:
    small = {"ai": "AI", "llm": "LLM", "ml": "ML", "mcp": "MCP"}
    return " ".join(small.get(w, w.capitalize()) for w in tag.split("-"))


def render_blog(posts: list[dict]) -> str:
    if not posts:
        return '\n        <p class="blog-empty">No posts yet. Check back soon.</p>\n        '
    cards = []
    for p in posts:
        pills = "".join(f'<span class="pill">{esc(tag_label(t))}</span>' for t in p["tags"])
        img = (f'\n          <img class="project-card__img" src="{esc(p["image"])}" alt="" loading="lazy">'
               if p["image"] else "")
        cards.append(f"""
        <article class="project-card blog-card">{img}
          <div class="project-card__body">
            <div class="project-card__head">
              <h2 class="project-card__title"><a href="{esc(p["url"])}" target="_blank" rel="noopener">{esc(p["title"])}</a></h2>
              <span class="project-card__date"><time datetime="{esc(p["date"])}">{esc(month_year(p["date"]))}</time></span>
            </div>
            <p class="project-card__meta">{p["readMinutes"]} min read · Medium</p>
            <p class="blog-card__excerpt">{esc(p["excerpt"])}</p>
            <div class="pills">{pills}</div>
            <a class="blog-card__read" href="{esc(p["url"])}" target="_blank" rel="noopener">Read on Medium <span aria-hidden="true">↗&#xFE0E;</span></a>
          </div>
        </article>""")
    return "".join(cards) + "\n        "


def render_recent(posts: list[dict]) -> str:
    count = len(posts)
    latest = month_year(posts[0]["date"]) if posts else "Soon"
    rows = []
    for p in posts[:RECENT_COUNT]:
        rows.append(f"""
          <li class="timeline-update">
            <div class="timeline-update__point" aria-hidden="true"></div>
            <span class="timeline-update__date"><time datetime="{esc(p["date"])}">{esc(display_date(p["date"]))}</time></span>
            <article class="timeline-update__body">
              <h2><a href="{esc(p["url"])}" target="_blank" rel="noopener">{esc(p["title"])}</a></h2>
              <p>{esc(p["excerpt"])}</p>
              <span class="timeline-update__meta">{p["readMinutes"]} min read · Medium</span>
            </article>
          </li>""")
    return f"""
      <div class="container updates-layout">
        <header class="updates-intro">
          <span class="card-label">Writing / Building Jarvis</span>
          <h2 id="writing-title">Recent<br>writing.</h2>
          <p>Notes from building a local, tool-using AI agent from scratch, including what broke and why.</p>
          <div class="updates-intro__meta" aria-label="Writing summary">
            <span>{count:02d} {"post" if count == 1 else "posts"}</span>
            <span>Latest / {esc(latest)}</span>
          </div>
          <div class="writing-links">
            <a class="writing-all" href="blog.html">All posts <span aria-hidden="true">→</span></a>
            <a class="writing-medium" href="{PROFILE_URL}" target="_blank" rel="noopener" aria-label="Follow on Medium" title="Follow on Medium">
              <i class="fa-brands fa-medium" aria-hidden="true"></i>
            </a>
          </div>
        </header>
        <ol class="updates-timeline writing-list" aria-label="Recent blog posts">{"".join(rows)}
        </ol>
      </div>
    """


def replace_block(page: str, name: str, content: str) -> str:
    start, end = f"<!-- posts:{name}:start -->", f"<!-- posts:{name}:end -->"
    pattern = re.compile(re.escape(start) + ".*?" + re.escape(end), re.S)
    if not pattern.search(page):
        sys.exit(f"error: markers {start} / {end} not found")
    return pattern.sub(lambda _: start + content + end, page, count=1)


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="report changes without writing")
    ap.add_argument("--offline", action="store_true", help="skip the fetch; re-render from posts.json")
    args = ap.parse_args()

    existing = json.loads(POSTS_JSON.read_text()) if POSTS_JSON.exists() else []
    fetched = [] if args.offline else parse_feed(fetch_feed())
    posts = merge(existing, fetched)

    known = {p["url"] for p in existing}
    new = [p for p in posts if p["url"] not in known]
    print(f"feed: {len(fetched)} posts · stored: {len(existing)} · new: {len(new)}")
    for p in new:
        print(f"  + {p['date']}  {p['title']}")

    outputs = {
        POSTS_JSON: json.dumps(posts, indent=2, ensure_ascii=False) + "\n",
        BLOG_HTML: replace_block(BLOG_HTML.read_text(), "blog", render_blog(posts)),
        INDEX_HTML: replace_block(INDEX_HTML.read_text(), "recent", render_recent(posts)),
    }
    for path, text in outputs.items():
        changed = not path.exists() or path.read_text() != text
        print(f"{'changed ' if changed else 'same    '} {path.relative_to(ROOT)}")
        if changed and not args.dry_run:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
    if args.dry_run:
        print("dry run: nothing written")


if __name__ == "__main__":
    main()
