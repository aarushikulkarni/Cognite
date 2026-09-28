from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import uuid4

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


_STORE: dict[str, StoredIntervention] = {}


def put(item: StoredIntervention) -> StoredIntervention:
    _STORE[item.id] = item
    return item


def get(intervention_id: str) -> StoredIntervention | None:
    item = _STORE.get(intervention_id)
    if item is None:
        return None
    if item.expires_at < datetime.now(timezone.utc):
        _STORE.pop(intervention_id, None)
        return None
    return item


def new_id() -> str:
    return str(uuid4())
