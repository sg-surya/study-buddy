# PRD — PS 01 Study Companion from Real Notes
**Track 1: Best Use of Gemma 4 | Hacktoberfest Hackday 2026**

## 1. Problem & Vision
Students revise from messy lecture notes / short PDFs. Generic chatbots hallucinate answers not present in notes, so learners can't tell what is supported vs. invented.

**Vision:** A focused study companion that turns 2–5 pages of notes on ONE topic into an interactive tutoring session: ask → see evidence → quiz → get feedback. Grounded in supplied material, honest about limits.

**Success for Hack Day:** Demo on one topic (e.g., Photosynthesis / Operating Systems / Thermodynamics) proves: supported Q shows evidence, incorrect quiz answer gets explanation, unsupported Q is refused with guidance.

## 2. Goals / Non-Goals
**Goals (must demo):**
- Upload/paste notes (text, .txt/.md/.pdf ≤ ~10k words)
- Grounded Q&A with visible evidence (quote + chunk ID)
- Auto-generated practice quiz (MCQ + short-answer, 5 questions) with grading + explanations + hints
- Explicit "Not in notes" handling
- Gemma 4 central to interpretation, Q&A, quiz, feedback

**Non-Goals (out of scope for Hack Day):**
- Full LMS, multi-subject library, user accounts/auth, spaced-repetition engine
- Diagram/image understanding beyond text extraction (stretch only)
- Long-document (50+ page) RAG scaling

## 3. Target User & Demo Persona
- **User:** 1st/2nd-year student revising night before exam with 3 pages of notes.
- **Demo persona:** Judge watches student load `sample-photosynthesis.md`, ask supported Q, attempt quiz wrong, ask out-of-scope Q.

## 4. Core User Flow (required workflow)
```
Upload/paste notes → Ask question → Inspect evidence → Practice quiz → Receive feedback
```

1. Land → paste/upload notes + pick topic name → sees parsed chunks + word count
2. Ask tab: type question → answer card: answer + evidence quotes (clickable, highlighted in source) + confidence (Supported / Partial / Not found)
3. Quiz tab: Generate (difficulty selector) → answer 5 Qs → Submit → score + per-Q correct/incorrect + explanation + hint + "retry"
4. Unsupported path: "Who discovered X in 1990?" (not in notes) → "Not enough info in your notes" + suggests what to add / related supported topic

## 5. Functional Requirements

### FR-1 Notes ingestion
- Inputs: paste text, upload `.txt/.md/.pdf` (pdf via `pypdf` text extract, ≤5MB)
- Chunking: ~300-500 tokens, overlap 50, store `id, text, page/para index`
- Show chunk list + char count; allow delete/clear
- Ship with 2 sample notes in `/samples/` (Photosynthesis, OS-Processes)

### FR-2 Grounded Q&A
- Retrieval: embed chunks ( embeddings API or local TF-IDF/BM25 fallback for offline demo) → top-k=4 by cosine
- Prompt Gemma 4 with: system instruction (answer ONLY from context, cite chunk IDs, say NOT_FOUND if absent), context chunks, question
- Output contract (JSON from LLM, rendered as card):
  ```json
  {"answer": "...", "evidence": [{"chunk_id":"c2","quote":"..."}], "verdict": "SUPPORTED|PARTIAL|NOT_FOUND", "hint_for_study": "..."}
  ```
- UI: answer + evidence quotes with "show in notes" highlight + verdict badge
- If `NOT_FOUND`: fixed template — "I couldn't find this in your notes…" + 1 suggestion

### FR-3 Quiz generation + evaluation
- Generate: Gemma 4 prompt → 5 Qs mixed (3 MCQ, 2 short-answer) from retrieved/chunked notes, each with `question, options?, correct_answer, explanation, source_chunk_id, difficulty`
- Evaluate:
  - MCQ: exact match
  - Short-answer: Gemma 4 as judge with rubric (correct / partially / incorrect + explanation + hint, reference expected answer)
- Feedback card per Q: your answer vs correct, explanation of why wrong, hint ("Re-read chunk c3…"), retry button

### FR-4 Honesty / guardrails
- Unsupported detector: if top-k similarity < threshold OR LLM verdict NOT_FOUND → refuse path
- No hallucinated citations: evidence quotes must be substring-matched to chunk text (code-verified, not LLM-claimed)
- Show model name + "Grounded in your notes" disclaimer

### FR-5 Gemma 4 usage (judging criterion)
- Used for: (a) Q&A synthesis, (b) quiz generation, (c) short-answer grading + explanations/hints
- Configurable provider: `GEMMA_PROVIDER=google-ai-studio | ollama | groq` — default Google AI Studio (`gemma-3-...` / `gemma-4` when available), Ollama `gemma3` fallback for offline
- Log model ID + latency per call in footer/debug panel

## 6. Non-Functional Requirements
- Demo reliability: works offline-ish (BM25 fallback if embeddings/LLM key missing → canned demo mode with pre-recorded answers)
- Latency: Q&A <8s, quiz gen <15s on hackday WiFi
- Simple deploy: frontend static + one Python backend; `README` 3-command run
- Open-source: MIT license, public repo

## 7. Tech Architecture (recommended, hackday-fast)
**Option A (recommended): Streamlit monolith** — fastest, 1 language, no CORS.
**Option B: Vite + Tailwind + FastAPI** — nicer UI, more work.

Recommend A for <8hr build. Architecture same either way:
```
UI → API layer → Retriever (chunk+embed/BM25) → Gemma 4 (prompt) → Verifier (quote substring check) → Render
```
- Backend: Python 3.11, FastAPI (or Streamlit), `sentence-transformers/all-MiniLM-L6-v2` or TF-IDF fallback, `pypdf`
- LLM client: thin `llm.py` wrapper supporting Google AI Studio + Ollama, JSON-mode, retry 1x
- No DB: in-memory session + `localStorage` for notes; no auth

## 8. API / Module Spec (if FastAPI)
- `POST /notes/ingest {text|file} → {chunks[]}`
- `POST /ask {question} → {answer, evidence[], verdict}`
- `POST /quiz/generate {num=5, difficulty} → {questions[]}`
- `POST /quiz/grade {answers[]} → {score, per_question[{correct, explanation, hint}]}`
All responses include `model_id, latency_ms`.

## 9. Prompts (v1 drafts)
- **QA_SYSTEM:** "You are a tutor. Answer ONLY using the provided NOTE CHUNKS. Cite chunk ids like [c2]. If answer is absent, return verdict NOT_FOUND and do not invent. Keep answer <150 words, then 1-line study hint."
- **QUIZ_GEN:** "From NOTES, write 5 questions (3 MCQ with 4 options, 2 short). Each needs correct_answer, 1-sentence explanation, source chunk id. Stay strictly within notes. Difficulty: {level}."
- **GRADE:** "Given question, expected answer, student answer, and source chunk: judge correct/partial/incorrect, explain the misconception in 2 sentences, give a hint without revealing answer directly."

## 10. UX Screens (3 tabs, minimal)
1. **Notes:** textarea + drag-drop + sample loader + chunk preview
2. **Ask:** chat-style Q&A + evidence cards + verdict badge + "Try: supported Q / unsupported Q" example buttons (for smooth demo)
3. **Quiz:** generate → attempt → score ring → per-Q feedback + retry
Global: model badge, clear-notes, mobile-readable

## 11. Demo Script (4 min, maps to checklist)
1. Load `photosynthesis.md` (30s) — show chunks
2. Supported Q: "What is the role of chlorophyll?" → answer + highlighted quote [c2] (60s)
3. Quiz: generate Easy → deliberately answer Q2 wrong → show explanation + hint (90s)
4. Unsupported Q: "What is the Krebs cycle ATP yield in muscle?" (not in notes) → NOT_FOUND message (30s)
5. Close: "Gemma 4 did Q&A+quiz+grading; evidence verified in code" (30s)

## 12. Risks & Mitigations
- Gemma 4 API key/quota fails → Ollama local + pre-cached demo responses + BM25 path
- Hallucinated citations → substring verifier rejects, forces NOT_FOUND
- PDF parse garbage → restrict to clean .md samples for demo, txt fallback
- Slow embeddings → TF-IDF default, embeddings optional flag

## 13. Acceptance Criteria (Definition of Done)
- [ ] Paste/upload works with sample topic
- [ ] Supported Q shows ≥1 verified quote
- [ ] Wrong quiz answer shows explanation + hint
- [ ] Unsupported Q shows limitation message (no invented facts)
- [ ] README + MIT LICENSE + samples + run instructions + model documented
- [ ] Honest limitations section in README

## 14. Future (post-hackday, not building now)
Flashcards, difficulty adaptation, PDF diagrams, multi-note sets, progress tracking.
