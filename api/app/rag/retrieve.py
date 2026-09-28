from app.rag.ingest import get_collection

VALID_TAGS = {"technology", "science", "history", "philosophy", "arts"}


def retrieve(interests: list[str], k: int = 4) -> list[dict[str, str]]:
    tags = [tag for tag in interests if tag in VALID_TAGS]
    if not tags:
        tags = sorted(VALID_TAGS)
    collection = get_collection()
    query = (
        "Write an engaging, accurate explainer for a curious adult interested in "
        + ", ".join(tags)
    )
    result = collection.query(
        query_texts=[query],
        n_results=k,
        where={"tag": {"$in": tags}},
    )
    documents = (result.get("documents") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]
    chunks: list[dict[str, str]] = []
    for doc, meta in zip(documents, metadatas):
        chunks.append(
            {
                "text": doc,
                "tag": str(meta.get("tag", "")),
                "title": str(meta.get("title", "")),
                "source": str(meta.get("source", "")),
            }
        )
    return chunks
