# Build Plan — PS 01 Study Companion

## 0. Decisions (lock these first, 15 min)
- Stack: **Python Streamlit monolith** (fastest) — single `app.py`. Only split to Vite+FastAPI if team has 3+ devs and >10 hrs.
- Gemma access: **Google AI Studio API key** primary, **Ollama `gemma3`** fallback. Get key now, test one call.
- Topic: **Photosynthesis (Biology)** sample, 2–3 pages, you write it so you know what's supported vs not.
- Repo: public GitHub, MIT license from start.

## 1. Repo Structure
```
/
├── app.py (or main.py)      # UI + routes
├── llm.py                   # Gemma wrapper (google/ollama, JSON parse, retry)
├── retrieval.py             # chunk + TF-IDF/BM25 (+ optional embeddings)
├── prompts.py               # QA / QUIZ / GRADE templates
├── samples/
│   ├── photosynthesis.md    # primary demo notes
│   └── os-processes.md      # backup topic
├── requirements.txt
├── README.md
├── LICENSE (MIT)
└── .env.example (GEMMA_API_KEY, GEMMA_MODEL)
```

## 2. Phased Timeline (8-hour hackday)
| Phase | Time | Owner | Output |
|---|---|---|---|
| P0 Setup | 0:00–0:45 | all | repo + env + Gemma hello-world + sample notes written |
| P1 Ingest + Retrieval | 0:45–2:00 | Dev A | paste/upload, chunker, top-k search, chunk viewer |
| P2 Grounded Q&A | 2:00–3:30 | Dev B | `/ask` + evidence verifier + verdict UI + NOT_FOUND path |
| P3 Quiz + Grading | 3:30–5:30 | Dev A/B | generate 5 Qs + MCQ auto-grade + Gemma short-answer judge + feedback cards |
| P4 Polish + Demo armor | 5:30–6:30 | all | example Q buttons, latency/model badge, offline canned fallback, mobile CSS check |
| P5 Submission | 6:30–8:00 | one | README, LICENSE, demo video run-through, public push, booklet links |

If solo: do P0→P1→P2→P3 in order, cut embeddings (TF-IDF only), cut PDF upload (paste + .md only).

## 3. Task Checklist (in order)
- [ ] `requirements.txt`: streamlit, pypdf, scikit-learn (TF-IDF), requests / google-generativeai
- [ ] Write `samples/photosynthesis.md` (~800 words, 6 sections with clear facts)
- [ ] Chunker (400 tokens/overlap) + unit check: quotes are substrings
- [ ] Retriever: TF-IDF baseline working; add embeddings only if time
- [ ] `llm.py`: `ask_gemma(prompt, json=True)` with provider switch + timeout + 1 retry
- [ ] Ask UI + evidence highlight + verdict badge + substring verifier
- [ ] Pre-test 2 Qs: 1 supported ("role of chlorophyll?"), 1 unsupported ("Krebs ATP in muscle?") — hardcode expected verdicts
- [ ] Quiz gen + grade + feedback UI + score
- [ ] Canned fallback: if no API key, return pre-saved JSON for the 2 demo Qs + 5 demo quiz Qs
- [ ] README: what/track/PS, demo steps, run commands, model + deps, limitations, sample Qs
- [ ] Final dry run (4-min script in PRD §11) on fresh machine/incognito

## 4. Team Roles (2–3 people)
- Dev A: ingestion + retrieval + quiz
- Dev B: LLM wrapper + Q&A + grading prompts
- Dev C (if present): UI polish + README + demo script + submission

## 5. Test / Verification (do live before freeze)
- Supported Q returns ≥1 verified quote (substring match passes)
- Wrong quiz answer → explanation + hint rendered
- Unsupported Q → NOT_FOUND template, zero invented facts
- Kill WiFi / remove API key → canned demo still runs

## 6. What to Cut First (if behind)
1. PDF upload → keep paste + .md
2. Embeddings → TF-IDF only
3. Difficulty selector → fixed Easy
4. Short-answer judge → MCQ-only quiz (still meets "evaluate responses")

## 7. Submission Checklist (from booklet)
- One PS chosen (PS 01), one topic, minimal workflow done
- Sample inputs included, synthetic labeled if any
- Normal + limitation cases demoed, evidence shown
- Public repo + MIT + README (run steps, model, deps) + honest limitations
