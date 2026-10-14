# Pitch Deck Content — Study Companion from Real Notes (PS-01)
Fills `AI_Innovation_Pitch_Deck_Template.pptx` (7 slides). Replace `[...]` before presenting.

## Slide 1 — Title
- Project: **Study Companion from Real Notes — Evidence-First Tutor**
- One-liner: *Learn from your notes. Verify every answer.* An AI tutor that answers only from student-uploaded notes, shows page-tagged evidence, quizzes, and admits what it doesn't know.
- Team: [...] · Organisation: E-Cell IIMTU / Hacktoberfest HackDay 2026 · Track 1 (Best Use of Gemma 4), PS-01

## Slide 2 — 01 The Problem
- What: Students revise from short PDFs/notes; generic chatbots answer from parametric memory even when notes lack the answer — learners can't tell what's supported vs invented.
- Why it matters: wrong confidence before exams; no way to trace a claim back to the notes; no feedback on what was misunderstood.
- Evidence: our leph101.pdf demo — identical questions get SUPPORTED-with-page vs NOT_FOUND depending on notes (live proof, not a statistic). [Add booklet PS-01 reference]
- Today: ChatGPT-style chat + manual self-quizzing; insufficient because neither grounds answers in *your* material nor verifies citations.

## Slide 3 — 02 The Proposed Solution
- What: Web app — upload PDF/text → Ask (grounded answer + evidence cards with 📄 page) → Explain (3 levels) → Quiz (MCQ + short-answer, auto-graded with hints).
- Flow: input notes → embed+retrieve top chunks → Gemma 4 answers with citations → code verifies every quote is a real substring → render with page tags; blank quiz answers auto-fail (no LLM hallucinated passes).
- Core features: (1) page-tagged evidence, click-to-jump flash highlight; (2) NOT_FOUND abstention guard; (3) real-notes quiz generation (LLM → extractive-RAG → canned); (4) embedding-similarity grading with partial credit.
- Impact: revision time → answers traceable in seconds; accuracy → zero invented citations by construction; access → runs fully offline on LM Studio.

## Slide 4 — 03 Target Users
- Primary: college students revising from 2–5 pages of notes (night-before-exam use case).
- Needs: "is this answer really in my notes?", practice questions, honest feedback on wrong answers.
- Secondary: judges/mentors (verify claims via evidence + retrieval scores), teachers (see what students get wrong).
- Start: one topic demo (leph101 Physics Ch.1 / Photosynthesis sample); pilot = HackDay judges.

## Slide 5 — 04 The AI Component
- Model: **Gemma 4 (`google/gemma-4-e2b`)**, served locally via **LM Studio** (OpenAI-compatible `:1234`); embeddings `text-embedding-nomic-embed-text-v1.5`; Google AI Studio as fallback.
- Why: open-weight (Track-1 requirement), local inference = privacy + offline demo, strong instruction-following for JSON-mode Q&A/quiz/grading.
- AI tasks: grounded Q&A synthesis, quiz generation, short-answer judging, simplification — retrieval + citation validation stay in deterministic code, never in prose.
- Safeguards: substring citation gate (unverified → forced NOT_FOUND), blank-answer short-circuit, similarity thresholds (0.72 correct / 0.55 partial), limitations documented in README.

## Slide 6 — 05 Technology Stack
| Layer | Technology | Role |
|---|---|---|
| Frontend / UI | React + TypeScript + Vite + Tailwind | Upload, chat, evidence cards, quiz, page jump highlight |
| Backend / API | Python + FastAPI (`backend/rag.py`, `llm.py`, `tutor.py`, `main.py`) | chunking, retrieval, orchestration, validation, grading |
| AI / ML | Gemma 4 via LM Studio; Google AI Studio fallback | grounded answers, quiz gen, grading, explanations |
| Retrieval | LM Studio embeddings (cosine) → stdlib TF-IDF fallback | top-k chunks + scores (no vector DB needed at this scale) |
| Hosting / DevOps | Local (`start.bat` → :5173 + :8000), GitHub | demo + version control |

## Slide 7 — 06 Links & References
- Demo/video: [...]
- Repo (MIT): [...] (contains PRD, plan, CHANGELOG, README, samples)
- Model card + licence: https://ai.google.dev/gemma
- Sources: PROBLEM STATEMENTS.pdf (PS-01, p.4); sample notes `samples/photosynthesis.md`; user PDFs (labelled, e.g. NCERT leph101)
