import json
from pathlib import Path
import re
import urllib.request
import ssl
import certifi

COLLECTIONS = [
    {
        "id": 1661,
        "tag": "mystery",
        "folder": "mystery",
        "title": "Adventures of Sherlock Holmes",
    },
    {
        "id": 17893,
        "tag": "horror",
        "folder": "horror",
        "title": "Classic Ghost Stories",
    },
    {
        "id": 27365,
        "tag": "scifi",
        "folder": "scifi",
        "title": "Tales of Space and Time",
    },
    {
        "id": 7477,
        "tag": "fantasy",
        "folder": "fantasy",
        "title": "The Book of Wonder",
    },
]

def trusted_context():
  return ssl.create_default_context(cafile=certifi.where())

def ingest_anthologies():
  ctx = trusted_context()
  base_dir = Path(__file__).resolve().parent.parent / "knowledge"

  for col in COLLECTIONS:
    target_dir = base_dir / col["folder"]
    target_dir.mkdir(parents=True, exist_ok=True)

    url = f"https://gutendex.com/books/{col['id']}"
    req = urllib.request.Request(url, headers={"User-Agent": "CogniteDev/1.0"})

    try:
      with urllib.request.urlopen(req, context=ctx) as resp:
        meta = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
      print(f"Error fetching metadata for {col['tag']}: {e}")
      continue

    text_url = meta["formats"].get(
        "text/plain; charset=us-ascii"
    ) or meta["formats"].get("text/plain; charset=utf-8")
    if not text_url:
      print(f"Skipping {col['tag']}: no plain text.")
      continue

    with urllib.request.urlopen(text_url, context=ctx) as resp:
      raw = resp.read().decode("utf-8", errors="ignore")

    # Strip Project Gutenberg header and footer
    body = re.split(
        r"\*\*\* START OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*",
        raw,
        flags=re.I,
    )[-1]
    body = re.split(
        r"\*\*\* END OF (THE|THIS) PROJECT GUTENBERG EBOOK", body, flags=re.I
    )[0]

    # Extract 6 non-overlapping passages across the book (~3,500 chars / ~700 words each)
    window_size = 3500
    step = 12000  # Jump forward 12,000 characters between scenes
    start_offset = 3000

    count = 0
    for idx in range(6):
      start = start_offset + (idx * step)
      end = start + window_size

      if start >= len(body):
        break

      passage = body[start:end].strip()
      if len(passage) < 1500:
        continue

      filename = f"{col['folder']}_scene_{idx + 1}.md"
      content = f"""---
title: {col['title']} (Scene #{idx + 1})
tag: {col['tag']}
source: Project Gutenberg (#{col['id']})
license: Public Domain
is_complete_passage: true
---

{passage}
"""
      (target_dir / filename).write_text(content, encoding="utf-8")
      count += 1

    print(f"Generated {count} passages for {col['tag']}")


if __name__ == "__main__":
  ingest_anthologies()