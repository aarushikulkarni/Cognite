from __future__ import annotations

import json
import random
from datetime import datetime, timedelta, timezone

from openai import OpenAI

from app.config import settings
from app.rag.retrieve import retrieve
from app.store import StoredIntervention, StoredQuestion, new_id, put

CLASSIC_FICTION_TAGS = {"mystery", "horror", "scifi", "fantasy"}
PURE_AI_GENERATION_TAGS = {"romance"}
FACTUAL_TAGS = {"technology", "science", "history", "philosophy", "arts"}

ROMANCE_TROPES = [
    "enemies to lovers",
    "second chance",
    "fake dating",
    "found family",
    "secret correspondence",
]
ROMANCE_PERSPECTIVES = [
    "first-person POV",
    "close third-person POV",
    "dual-perspective narration",
    "epistolary format",
]
ROMANCE_TONES = [
    "warm and witty",
    "melancholic but hopeful",
    "playful and mischievous",
    "slow-burn yearning",
]
CLASSIC_QUIZ_LENSES = [
    "deduction",
    "psychological motives",
    "atmosphere/vocabulary",
]
FACTUAL_LENSES = [
    "first-principles",
    "historical inflection",
    "practical dilemma",
]
WORD_TARGETS = {3: 480, 4: 640, 5: 800}


def _client() -> OpenAI:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=settings.openai_api_key)


def _parse_and_store(data: dict, duration_minutes: int) -> StoredIntervention:
    raw_questions = data.get("questions") or []
    if not raw_questions:
        raise RuntimeError("Model did not return quiz questions")

    questions: list[StoredQuestion] = []
    for raw in raw_questions:
        choices = raw.get("choices", [])
        if not choices:
            continue
        questions.append(
            StoredQuestion(
                id=str(raw.get("id") or f"q{len(questions) + 1}"),
                prompt=str(raw.get("prompt") or ""),
                choices=[{"id": str(choice["id"]), "text": str(choice["text"])} for choice in choices],
                answer_id=str(raw.get("answerId") or raw.get("answer_id") or choices[0]["id"]),
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


def _pick_chosen_tag(interests: list[str]) -> str:
    for tag in interests:
        if tag in CLASSIC_FICTION_TAGS or tag in PURE_AI_GENERATION_TAGS or tag in FACTUAL_TAGS:
            return tag
    return interests[0] if interests else "science"


def generate_intervention(interests: list[str], duration_minutes: int) -> StoredIntervention:
    chosen_tag = _pick_chosen_tag(interests)

    if chosen_tag in PURE_AI_GENERATION_TAGS:
        trope = random.choice(ROMANCE_TROPES)
        perspective = random.choice(ROMANCE_PERSPECTIVES)
        tone = random.choice(ROMANCE_TONES)
        prompt = f"""You are writing a romantic micro-story for a reading intervention.
Create a complete original micro-story that feels self-contained and vivid. Use the trope "{trope}", written in {perspective}, with a {tone} tone.
The story should be around 500-700 words and should read like a polished literary vignette rather than a synopsis.
Then write 4 multiple-choice deduction questions about the story's events, motives, or emotional stakes.

Return JSON with this exact shape:
{{
  "title": string,
  "passageMarkdown": string,
  "questions": [
    {{
      "id": "q1",
      "prompt": string,
      "choices": [{{"id": "a", "text": string}}, {{"id": "b", "text": string}}, {{"id": "c", "text": string}}, {{"id": "d", "text": string}}],
      "answerId": "a"
    }}
  ]
}}
"""
        response = _client().chat.completions.create(
            model=settings.openai_chat_model,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You write original, emotionally textured romantic fiction. Keep it literary, vivid, and grounded in clear cause-and-effect. Return only valid JSON matching the schema.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.9,
        )
        data = json.loads(response.choices[0].message.content or "{}")
        return _parse_and_store(data, duration_minutes)

    if chosen_tag in CLASSIC_FICTION_TAGS:
        chunks = retrieve([chosen_tag], k=1)
        if not chunks:
            raise RuntimeError("Knowledge index is empty. Run: python scripts/ingest.py")

        source = chunks[0]
        lens = random.choice(CLASSIC_QUIZ_LENSES)
        prompt = f"""Use the passage below as the reading source. Preserve its exact wording as much as possible for the passage.
Title: {source['title']}

Passage:
{source['text']}

Generate 4 multiple-choice questions about the passage using the lens of {lens}.
The questions should require close reading and inference rather than trivia.

Return JSON with this exact shape:
{{
  "title": string,
  "passageMarkdown": string,
  "questions": [
    {{
      "id": "q1",
      "prompt": string,
      "choices": [{{"id": "a", "text": string}}, {{"id": "b", "text": string}}, {{"id": "c", "text": string}}, {{"id": "d", "text": string}}],
      "answerId": "a"
    }}
  ]
}}
"""
        response = _client().chat.completions.create(
            model=settings.openai_chat_model,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "You create close-reading deduction quizzes grounded in the provided passage. Do not invent details beyond the passage.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
        )
        data = json.loads(response.choices[0].message.content or "{}")
        data["passageMarkdown"] = source["text"]
        data["title"] = source["title"] or data.get("title") or "Classic passage"
        return _parse_and_store(data, duration_minutes)

    chunks = retrieve([chosen_tag], k=3)
    if not chunks:
        raise RuntimeError("Knowledge index is empty. Run: python scripts/ingest.py")

    sources = "\n\n".join(
        f"SOURCE {i + 1} (tag={c['tag']}, title={c['title']}):\n{c['text']}"
        for i, c in enumerate(chunks)
    )
    words = WORD_TARGETS.get(duration_minutes, 640)
    lens = random.choice(FACTUAL_LENSES)
    prompt = f"""You create a voluntary reading challenge for Cognite.
Use the source material below and frame the explanation through a {lens} lens.
Write a self-contained {duration_minutes}-minute reading (~{words} words) that is clear, engaging, and grounded in the evidence.
Then write 4 multiple-choice comprehension questions that can be answered from the passage.

Return JSON with this shape:
{{
  "title": string,
  "passageMarkdown": string,
  "questions": [
    {{
      "id": "q1",
      "prompt": string,
      "choices": [{{"id": "a", "text": string}}, {{"id": "b", "text": string}}, {{"id": "c", "text": string}}, {{"id": "d", "text": string}}],
      "answerId": "a"
    }}
  ]
}}

Selected tag: {chosen_tag}

SOURCES:
{sources}
"""
    response = _client().chat.completions.create(
        model=settings.openai_chat_model,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "You write grounded educational readings. Use the supplied sources carefully and do not invent citations, studies, or statistics when evidence is thin.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )
    data = json.loads(response.choices[0].message.content or "{}")
    return _parse_and_store(data, duration_minutes)
