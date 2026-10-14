# Changelog — PS 01 Study Companion

All notable changes tracked here (newest first).

## [0.9.0] - 2026-10-14
### Changed (landing + notebook flow)
- Landing = hero only with CREATE NOTEBOOK CTA; white sharp-edge modal (orange corner cutouts) with Upload incl. drag-drop / Paste / Sample
- Upload creates `/notebook/{uuid}`: left panel = source card + live pipeline steps (upload → parse → chunk → retrieval) + cited-first searchable sources; right = Ask/Quiz/Explain
- Backend multi-notebook store (`notebook_id` everywhere + `GET /api/notebooks/{id}`); recent notebooks on hero with delete
- Verified: `npm run build` passes; multi-notebook API live (sample→testnb→summary round-trip OK)

## [0.8.0] - 2026-10-14

### Added (notebook view /c/id)
- HashRouter: home `/` + notebook `/c/{uuid}` (persisted in localStorage, follow-ups stay in thread)
- Notebook layout: thread with SOURCES cards + cited-first source panel; full chunk list collapsed with search filter (no more 46-chunk dump)
- Studio source panel also cited-first + searchable
### Fixed
- `p.p.1` double-prefix everywhere (backend already returns `p.N`); hero status now `46 chunks · 44 pages`
- Verified: `npm run build` passes

## [0.7.4] - 2026-10-14
### Changed (icons + centered hero + responsive)
- Removed empty-state box + judges-script section; studio renders only after notes load (+ footer)
- All emojis replaced with Lucide icons (nav, tabs, attach, evidence, quiz verdicts, explain, footer)
- Hero content vertically + horizontally centered (flex-1 justify-center); responsive tweaks (fluid type, wrap, min-w-0 inputs, hidden cards on small screens)
- Verified: `npm run build` passes

### Changed (hero = single entry point)
- White hero box now merged: 📎 attach (PDF/txt/md) + ask input + Ask button, with Sample / Paste chips + chunk status + clear inside the box
- Studio upload card removed; empty studio shows "Back to hero" CTA
- Verified: `npm run build` passes

### Changed (portfolio-style hero like reference)
- Full-viewport orange hero: grid overlay, giant STUDY watermark + STUDY COMPANION display type (Anton), mono eyebrow, black START STUDYING CTA, floating live-model card + demo card, scrolling ticker strip
- Nav links jump to studio tabs; hero ask box + demo card feed straight into chat
- Verified: `npm run build` passes

### Changed (ChatGPT-style chat + orange hero)
- Full-bleed orange gradient hero with centered white ask box (asks jump straight into chat)
- Ask tab = chat thread (oldest→newest) + sticky docked input + typing indicator + empty-state
- Verified: `npm run build` passes (0.7.4)

## [0.7.3] - 2026-10-13

## [0.7.2] - 2026-10-13

## [0.7.1] - 2026-10-13

## [0.7.0] - 2026-10-13

### Changed (light + orange premium UI, new layout)
- Full light theme (warm paper bg, white cards, orange-600 accents) across App/Ask/Quiz/Explain
- New layout: top nav + hero + step tracker + upload card on top; workspace = study cards left + sticky Source panel right; tabs became hint cards; demo script collapsed at bottom
- Verified: `npm run build` passes (hot-reload on :5173)

## [0.6.2] - 2026-10-13

### Added
- `PITCH-DECK.md` — 7-slide pitch content filled for our project (problem/solution/users/AI/stack/links), maps to `AI_Innovation_Pitch_Deck_Template.pptx`

## [0.6.1] - 2026-10-13`

### Added
- `start.bat` — single-command starter (backend :8000 + frontend :5173 + browser); `stop.bat` — kills both; README run section updated

## [0.6.0] - 2026-10-13

### Added (React + Vite frontend — beat-the-crowd build)
- `backend/` FastAPI: `rag.py` + `llm.py` + `tutor.py` (ported tested logic) + `main.py` (7 endpoints: health/notes-sample/text/upload/clear, tutor-ask/explain, quiz-generate/evaluate)
- `frontend/` Vite+React+TS+Tailwind: model-status header, upload sidebar + demo checklist, Notes/Ask/Explain/Quiz tabs, evidence cards click-to-jump with gold flash highlight, markdown answers, RAG scores, quiz review with hints
- Verified: `/api/health` sees gemma-4-e2b + embeddings; ask → SUPPORTED with real evidence (19s); quiz → 5 `ai`; `npm run build` passes
- `app.py` (Streamlit) kept as offline fallback

## [0.5.1] - 2026-10-13

### Fixed (grading honesty)
- Blank short-answer → instant ❌ "No answer written" (LLM judge hallucinated passes on empty input — bypassed now; prompt also hardened)
- MCQ `index=None` → no auto-selected first option; untouched Q → "No option selected"; fresh widget keys per quiz (`qv`) so regenerate can't carry stale picks

## [0.5.0] - 2026-10-13

### Added (page sources + submission armor)
- Every chunk page-tagged: `chunk_pdf_pages()` chunks each PDF page separately → Ask evidence shows `Evidence c2 (📄 p.3)`, Notes tab `Chunk c2 · p.3`, quiz Qs + explanations + hints carry page
- `page_tag()` helper; pasted/txt notes show chunk IDs only (no fake pages)
- `README.md` (run/demo/grounding/limitations), `LICENSE` (MIT)
### Verified
- Simulated 3-page PDF: c1→p.2 evidence mapping correct; compile OK

## [0.4.2] - 2026-10-13

### Fixed
- `explain_notes()` prompt grounded: ONLY-from-notes + no-invent-facts instruction (judging me evidence criterion)

## [0.4.1] - 2026-10-13

### Fixed (quiz quality on real PDFs like leph101)
- Blank picker: skips headers (`is_header()` — ALL-CAPS / Chapter/Figure/Table), needs freq≥2 + len≥6, prefers mid-sentence + capitalized terms (`pick_keyword()`); `while`/`simple` jaise generic words `GENERIC` list me ban
- Short-Q keyword: same content scoring (was picking `simple`); distractors only freq≥2 terms
- Verified on leph101-style text: blanks → electric/attract/charges, short-Q → 'charge' (pehle: header/while/simple)

## [0.4.0] - 2026-10-13

### Changed (real RAG, no more dummy)
- Retrieval: `embed_lmstudio()` via LM Studio `/embeddings` (your loaded nomic model) with cosine ranking; TF-IDF kept as offline fallback — `retrieve()` tries vectors first
- Quiz: `build_extractive_quiz()` builds 3 MCQ (fill-in-the-blank from key sentences, distractors from notes) + 2 short-Q from the ACTUAL loaded notes — any PDF works; `generate_quiz()` order: LLM → extractive-rag → canned (last resort); CANNED kept only for <3-sentence notes
- Grading: `grade_short()` uses embedding similarity (≥0.72 correct, 0.55–0.72 partial) with keyword fallback; hints cite the source chunk
- UI: Ask tab shows `RAG retrieval: c2=0.80…` scores; sidebar separates Chat LLM picker from embeddings status; quiz shows source badge (`ai`/`extractive-rag`/`canned`)
### Verified
- Live vs LM Studio: embeddings OK; chlorophyll Q retrieves c2=0.80; sample quiz 5 extractive-rag; custom Eiffel notes → 5 extractive-rag (was canned before fix); grading sim 0.92→correct
### Added
- PDF upload (`.pdf` via `pypdf`): `extract_pdf_text()` with page count + graceful error; uploader now `.txt/.md/.pdf`
- LM Studio first (user choice): `call_lmstudio()` OpenAI-compatible (`/chat/completions`), auto-picks loaded LLM, model picker in sidebar + connection status; provider order LM Studio → Google → extractive fallback
- Extra stuff: 💡 Explain tab (Simple/Detailed/Exam-cram), AI quiz generation (`generate_quiz()` with difficulty Easy/Medium/Hard, canned fallback), Ask history (last 5), Clear-notes button
- `requirements.txt`: added `pypdf`, `requests`; `.env.example`: `LMSTUDIO_URL`, `LMSTUDIO_MODEL`
### Verified
- `py_compile` OK; 5 chunks; supported→SUPPORTED; unsupported→NOT_FOUND; quiz 5 (canned, no LLM loaded); explain fallback OK
- Live probe: LM Studio reachable but only `text-embedding-nomic-embed-text-v1.5` loaded → chat correctly falls back; user must load a Gemma LLM (e.g. `google/gemma-3-4b`) + Start Server

## [0.3.0] - 2026-10-13

## [0.2.0] - 2026-10-13
### Added
- `app.py` — working Streamlit monolith: Notes / Ask / Quiz tabs, sample loader, paste+upload, grounded Q&A + verdict badge, 5-Q quiz + grading + hints
- `samples/photosynthesis.md` — 6-section demo notes with out-of-scope note (Krebs/history)
- `requirements.txt`, `.env.example`
### Fixed
- Dropped sklearn/scipy (numpy2 conflict: `_ARRAY_API not found`) → stdlib TF-IDF cosine in `retrieve()`; zero heavy deps
### Verified
- `chunk_text` → 5 chunks; supported Q → SUPPORTED with evidence; unsupported Q → NOT_FOUND; quiz=5, short-grade OK (no API key, extractive-fallback)


## [0.1.0] - 2026-10-13
### Added
- `PRD-PS01.md` — full PRD for PS-01 (grounded Q&A, quiz, NOT_FOUND handling, Gemma 4)
- `PLAN-PS01.md` — 8-hr hackday plan, task checklist, cut-list
- `CHANGELOG.md` — started (this file)
- Ponytail skill loaded (full mode) — minimal-diff discipline for whole build
### Decisions
- Stack: Streamlit monolith (`app.py` single file first), TF-IDF retrieval, Gemma via Google AI Studio with extractive offline fallback
- Demo topic locked: Photosynthesis
- PDF upload deferred (paste + .txt/.md only for v0.2.0)
