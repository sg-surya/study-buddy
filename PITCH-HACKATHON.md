# Pitch — Study Companion from Real Notes (PS-01, Track 1: Best Use of Gemma 4)
Hacktoberfest HackDay 2026 · E-Cell IIMTU

Use this file as the single narration source for: (1) the slideshow deck `videos/pitch-deck`, (2) the motion-graphics explainer `videos/study-companion-explainer`. Time-box: 4-min live demo. 90-sec video cut marked below.

## One-liner
Learn from your notes. Verify every answer. An evidence-first AI tutor that answers only from student-uploaded notes, shows page-tagged proof, quizzes, and admits what it doesn't know.

## 90-sec voiceover script (explainer video)
1. HOOK (0-10s): "Night before exam. 3 pages of notes. You ask a chatbot — it answers confidently. But is it in YOUR notes? You can't tell."
2. PROBLEM (10-22s): "Generic chatbots answer from memory, not your material. Wrong confidence before exams. No trace back to the page. No feedback on what you got wrong."
3. SOLUTION (22-40s): "Study Companion flips it. Upload your PDF. Ask. Every answer comes with evidence cards — quote, chunk id, page number. Click to jump into your notes. Ask what isn't there — it says NOT FOUND, and guides you, instead of inventing facts."
4. HOW IT WORKS (40-58s): "Notes are chunked, page-tagged, retrieved by embeddings. Gemma 4 answers with citations. Deterministic code verifies every quote is a real substring — unverified means forced NOT FOUND. Quiz generates real questions from your notes, grades short answers by meaning, gives hints with page."
5. PROOF + CLOSE (58-75s): "Live demo: supported question shows evidence p.3. Wrong quiz answer gets explanation plus hint. Unsupported question gets honest refusal. Gemma 4 did Q&A, quiz, grading. Code did verification. Learn from your notes. Verify every answer."

## Slide-by-slide talk track (matches AI_Innovation_Pitch_Deck_Template.pptx)
- S1 Title (30s): project + one-liner + team/org + Track 1 PS-01.
- S2 Problem: students revise from short PDFs; chatbots hallucinate; can't tell supported vs invented; evidence = leph101.pdf live SUPPORTED vs NOT_FOUND split; today = ChatGPT-style chat + manual self-quiz, both ungrounded.
- S3 Solution: upload PDF/text → Ask (grounded + evidence + page) → Explain (3 levels) → Quiz + feedback. Features: page-tagged evidence + jump-highlight, NOT_FOUND guard, real-notes quiz (LLM → extractive-RAG → canned), embedding-similarity grading. Impact: traceable in seconds, zero invented citations by construction, fully offline via LM Studio.
- S4 Users: primary = college students night-before-exam; needs = "is this in my notes?", practice, honest feedback. Secondary = judges/mentors/teachers. Start = leph101 Ch.1 / photosynthesis sample, pilot = HackDay judges.
- S5 AI: Gemma 4 `google/gemma-4-e2b` local via LM Studio `:1234`, embeddings `text-embedding-nomic-embed-text-v1.5`, Google AI Studio fallback. Why: open-weight (Track-1), offline + private, strong JSON-mode instruction following. Tasks: Q&A synthesis, quiz gen, short-answer judging, simplification. Retrieval + citation check stay in code. Safeguards: substring gate, blank-answer fail, thresholds 0.72/0.55, limits in README.
- S6 Stack: React+TS+Vite+Tailwind (upload/chat/evidence/quiz) | FastAPI `rag.py llm.py tutor.py main.py` | Gemma 4 via LM Studio | LM-embeddings → TF-IDF fallback (no vector DB) | Local `start.bat` :5173+:8000, GitHub.
- S7 Links: demo video = `videos/study-companion-explainer/renders/video.mp4`; deck = `videos/pitch-deck`; repo (MIT) with PRD/plan/CHANGELOG/README/samples; model card https://ai.google.dev/gemma; sources PROBLEM STATEMENTS.pdf PS-01 p.4, `samples/photosynthesis.md`, `leph101.pdf`.

## 4-min live demo checklist
1. Upload `leph101.pdf` or Load sample → chunks show `· p.X` (30s).
2. Supported Q → answer + `Evidence c2 (p.3)` + RAG scores (60s).
3. Quiz Generate → answer 1 wrong → explanation + hint with page (90s).
4. Unsupported Q (Krebs ATP) → NOT_FOUND template (30s).
5. Close: "Gemma 4 did Q&A+quiz+grading; evidence verified in code" (30s).

## Honest limitations (say it on stage)
No chat LLM loaded → extractive fallback (retrieval still real). Scanned PDFs need OCR. Single-topic focus, no accounts.
