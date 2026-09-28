import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.rag.ingest import ingest_knowledge


def main() -> None:
    count = ingest_knowledge()
    print(f"Ingested {count} chunks into local Chroma.")


if __name__ == "__main__":
    main()
