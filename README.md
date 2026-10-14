# Study Companion from Real Notes — PS-01 (Track 1: Best Use of Gemma 4)

Turns 2–5 pages of notes into a tutoring session: **Ask (grounded + evidence + page) → Explain → Quiz + feedback**. Honest about limits: unsupported questions get NOT_FOUND, never invented facts.

Hacktoberfest Hackday 2026 · PS-01 · `PRD-PS01.md` · `PLAN-PS01.md` · `CHANGELOG.md`

## Run — single command
Double-click **`start.bat`** (or run `start.bat`) → opens backend (:8000) + frontend (:5173) + browser.
Stop with **`stop.bat`**. First time only: `pip install -r backend\requirements.txt` and `npm install` inside `frontend\`.
Manual alternative: `uvicorn main:app --port 8000` in `backend/` + `npm run dev -- --port 5173` in `frontend/`.

## Model (LM Studio, local Gemma)
1. LM Studio → load a Gemma chat model (e.g. `google/gemma-4-e2b`) + an embedding model → Start Server (`:1234`)
2. Sidebar shows Chat LLM ✅ and embeddings status; app auto-picks them
3. Fallbacks (demo never dies): Google AI Studio if `GEMMA_API_KEY` set → extractive mode otherwise

## Demo script (4 min)
1. Upload `leph101.pdf` (or Load sample) → chunks show `· p.X` page tags
2. Ask supported Q → answer + `Evidence c2 (📄 p.3)` + RAG scores
3. Quiz → Generate → answer 1 wrong → explanation + hint with page
4. Ask unsupported Q (e.g. Krebs ATP) → NOT_FOUND message

## How grounding works
- Retrieval: LM Studio embeddings (cosine) → TF-IDF fallback; every chunk page-tagged per PDF page
- LLM answers verified in code: evidence quotes must be substrings of notes, else forced NOT_FOUND
- Quiz: LLM-generated → extractive-rag from real notes → canned (last resort); grading by embedding similarity

## Limitations (honest)
- No chat LLM loaded → generative answers degrade to extractive (retrieval still real)
- Scanned/image PDFs need OCR (pypdf reads text PDFs only)
- Single-topic focus; no accounts, no multi-note library
