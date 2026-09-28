# Cognite

**Reignite your cognition.**

Cognite is a Chrome extension that watches time on sites you choose (YouTube, Reddit, and similar), then offers a **voluntary** 3–5 minute reading challenge with a short quiz. It is inspired by the idea of switching from long stretches of passive consumption into more active reading. It does **not** measure brain networks, and it does not block pages.

This repository is the two-week MVP: a Manifest V3 React/TypeScript extension plus a FastAPI service that generates readings with OpenAI and a small RAG knowledge base.

## What you can do in the MVP

1. Load the unpacked extension and finish onboarding (interests, duration, site list).
2. Browse an enabled site until the time threshold is reached (default **1 minute** for demos).
3. Start or skip the prompt. Skipping never traps you on the page.
4. Read a grounded passage, take a quiz, and earn XP / Cognitive Score.
5. See score, streak, and last session in the popup.

If the API is down, the intervention page falls back to a local sample reading.

## Repository layout

- `extension/` — Chrome MV3 extension (Vite, React, TypeScript, CRXJS)
- `api/` — FastAPI app, RAG pipeline, and `knowledge/` corpus
- `api/knowledge/` — tagged markdown used for retrieval (technology, science, history, philosophy, arts)

## Prerequisites

- Node 20+
- Python 3.11+
- Google Chrome
- An OpenAI API key (chat + embeddings)

## 1. Run the API

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# put OPENAI_API_KEY in api/.env
python scripts/ingest.py
uvicorn app.main:app --reload --port 8000
```

- Health: `GET http://127.0.0.1:8000/health`
- Generate: `POST /v1/interventions` with `{ "interests": ["science"], "durationMinutes": 4 }`
- Grade: `POST /v1/interventions/{id}/grade` with `{ "answers": { "q1": "b" } }`

Correct answers stay on the server. Re-run `python scripts/ingest.py` after you edit `knowledge/`.

Optional: set `COGNITE_API_KEY` in `api/.env` and `VITE_COGNITE_API_KEY` when building the extension so requests send `X-Cognite-Key`.

## 2. Build and load the extension

```bash
cd extension
npm install
npm run build
```

In Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked** → select `extension/dist`.

For a faster loop while changing UI, `npm run dev` from `extension/` also works with CRXJS; load the `dist` folder it writes.

## Demo script

1. Open the extension **Settings** (first install opens them) and save. Leave the threshold on **1 min (demo)** unless you want 10/15/20.
2. Keep the API running.
3. Open YouTube or Reddit and stay on the tab for about a minute.
4. Use **Start reading** (or **Practice now** in the popup).
5. Complete the quiz. Confirm XP and Cognitive Score in the popup.

## Scoring (behavioral, local)

Stored only in `chrome.storage.local`. The API never receives the site URL.

- Complete a quiz: +20 XP (later the same day: +10)
- Accuracy: +0–15 from `round(15 * correct / total)`
- Continuing a daily streak: +5
- Skip: +0

## Privacy

The content script runs only on the default high-distraction hosts. Cognite counts time on **sites you enabled**. It does not scrape page content and does not claim to measure ECN, DMN, or any neural signal.
