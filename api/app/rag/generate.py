from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from openai import OpenAI

from app.config import settings
from app.rag.retrieve import retrieve
from app.store import StoredIntervention, StoredQuestion, new_id, put

WORD_TARGETS = {3: 480, 4: 640, 5: 800}


def _client() -> OpenAI:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=settings.openai_api_key)


def generate_intervention(interests: list[str], duration_minutes: int) -> StoredIntervention:
    chunks = retrieve(interests, k=4)
    if not chunks:
        raise RuntimeError("Knowledge index is empty. Run: python scripts/ingest.py")

    sources = "\n\n".join(
        f"SOURCE {i + 1} (tag={c['tag']}, title={c['title']}):\n{c['text']}"
        for i, c in enumerate(chunks)
    )
    words = WORD_TARGETS.get(duration_minutes, 640)
    prompt = f"""You create a voluntary reading challenge for Cognite.
Use ONLY facts present in the sources. If the sources are thin, say what is known and do not invent citations, studies, or statistics.
Write a new {duration_minutes}-minute reading (~{words} words) that is engaging, clear, and self-contained.
Then write 4 multiple-choice questions that can be answered from the passage.

Return JSON with this shape:
{{
  "title": string,
  "passageMarkdown": string,
  "questions": [
    {{
      "id": "q1",
      "prompt": string,
      "choices": [{{"id": "a", "text": string}}, {{"id": "b", "text": string}}, {{"id": "c", "text": string}}, {{"id": "d", "text": string}}],
      "answerId": "a" | "b" | "c" | "d"
    }}
  ]
}}

Selected interests: {", ".join(interests)}

SOURCES:
{sources}
"""
    response = _client().chat.completions.create(
        model=settings.openai_chat_model,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "You write grounded educational readings. Never claim to measure brain networks.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )
    content = response.choices[0].message.content or "{}"
    data = json.loads(content)
    questions: list[StoredQuestion] = []
    for raw in data.get("questions", []):
        questions.append(
            StoredQuestion(
                id=str(raw["id"]),
                prompt=str(raw["prompt"]),
                choices=[{"id": c["id"], "text": c["text"]} for c in raw["choices"]],
                answer_id=str(raw["answerId"]),
            )
        )
    if not questions:
        raise RuntimeError("Model did not return quiz questions")

    item = StoredIntervention(
        id=new_id(),
        title=str(data.get("title") or "Reading challenge"),
        passage_markdown=str(data.get("passageMarkdown") or ""),
        estimated_minutes=duration_minutes,
        questions=questions,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=45),
    )
    return put(item)
