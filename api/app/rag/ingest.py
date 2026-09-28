from __future__ import annotations

import re
from pathlib import Path

import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

from app.config import settings

COLLECTION = "cognite_knowledge"
FRONTMATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.S)


def _parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    match = FRONTMATTER.match(text.strip())
    if not match:
        return {}, text
    meta: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip('"')
    return meta, match.group(2).strip()


def chunk_text(text: str, max_chars: int = 1800) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    chunks: list[str] = []
    buf = ""
    for para in paragraphs:
        candidate = f"{buf}\n\n{para}" if buf else para
        if buf and len(candidate) > max_chars:
            chunks.append(buf.strip())
            buf = para
        else:
            buf = candidate
    if buf:
        chunks.append(buf.strip())
    return chunks


def get_collection():
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    client = chromadb.PersistentClient(path=str(settings.chroma_dir))
    embedding_fn = OpenAIEmbeddingFunction(
        api_key=settings.openai_api_key,
        model_name=settings.openai_embedding_model,
    )
    return client.get_or_create_collection(
        name=COLLECTION,
        embedding_function=embedding_fn,
    )


def ingest_knowledge(knowledge_dir: Path | None = None) -> int:
    directory = knowledge_dir or settings.knowledge_dir
    collection = get_collection()
    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict[str, str]] = []

    for path in sorted(directory.rglob("*.md")):
        meta, body = _parse_frontmatter(path.read_text(encoding="utf-8"))
        tag = meta.get("tag", path.parent.name)
        title = meta.get("title", path.stem.replace("-", " "))
        source = meta.get("source", path.name)
        for index, chunk in enumerate(chunk_text(body)):
            ids.append(f"{path.stem}-{index}")
            documents.append(f"{title}\n\n{chunk}")
            metadatas.append(
                {
                    "tag": tag,
                    "title": title,
                    "source": source,
                    "path": str(path.relative_to(directory)),
                }
            )

    if not ids:
        raise RuntimeError(f"No markdown files found in {directory}")

    existing = collection.get()
    if existing.get("ids"):
        collection.delete(ids=existing["ids"])
    collection.add(ids=ids, documents=documents, metadatas=metadatas)
    return len(ids)
