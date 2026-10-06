from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.db.connection import cleanup_expired_interventions, get_connection, init_db

TTL = timedelta(minutes=45)


@dataclass
class StoredQuestion:
    id: str
    prompt: str
    choices: list[dict[str, str]]
    answer_id: str


@dataclass
class StoredIntervention:
    id: str
    title: str
    passage_markdown: str
    estimated_minutes: int
    questions: list[StoredQuestion]
    expires_at: datetime


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_questions(questions: list[StoredQuestion]) -> str:
    payload = [
        {
            "id": question.id,
            "prompt": question.prompt,
            "choices": question.choices,
            "answer_id": question.answer_id,
        }
        for question in questions
    ]
    return json.dumps(payload, ensure_ascii=False)


def _deserialize_questions(raw: str) -> list[StoredQuestion]:
    payload = json.loads(raw or "[]")
    return [
        StoredQuestion(
            id=str(item["id"]),
            prompt=str(item["prompt"]),
            choices=[{"id": str(choice["id"]), "text": str(choice["text"])} for choice in item.get("choices", [])],
            answer_id=str(item["answer_id"]),
        )
        for item in payload
    ]


init_db()


def put(item: StoredIntervention) -> StoredIntervention:
    cleanup_expired_interventions(_utcnow())
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO interventions (id, title, passage_markdown, estimated_minutes, questions_json, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id)
            DO UPDATE SET
                title = excluded.title,
                passage_markdown = excluded.passage_markdown,
                estimated_minutes = excluded.estimated_minutes,
                questions_json = excluded.questions_json,
                created_at = excluded.created_at,
                expires_at = excluded.expires_at
            """,
            (
                item.id,
                item.title,
                item.passage_markdown,
                item.estimated_minutes,
                _serialize_questions(item.questions),
                _utcnow().isoformat(),
                item.expires_at.astimezone(timezone.utc).isoformat(),
            ),
        )
    return item


def get(intervention_id: str) -> StoredIntervention | None:
    cleanup_expired_interventions(_utcnow())
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id, title, passage_markdown, estimated_minutes, questions_json, expires_at FROM interventions WHERE id = ?",
            (intervention_id,),
        ).fetchone()

    if row is None:
        return None

    expires_at = datetime.fromisoformat(row["expires_at"])
    if expires_at <= _utcnow():
        with get_connection() as conn:
            conn.execute("DELETE FROM interventions WHERE id = ?", (intervention_id,))
        return None

    return StoredIntervention(
        id=row["id"],
        title=row["title"],
        passage_markdown=row["passage_markdown"],
        estimated_minutes=row["estimated_minutes"],
        questions=_deserialize_questions(row["questions_json"]),
        expires_at=expires_at,
    )


def new_id() -> str:
    return str(uuid4())
