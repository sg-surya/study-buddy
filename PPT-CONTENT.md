# AI Innovation Pitch Deck — Meeko / Study Companion (PS-01)
Content for the 7-slide blank template. Copy each `## Slide N` into one PPT slide; **Speaker notes** go in the notes pane. Fill `[...]` placeholders before presenting.

---

## Slide 1 — Title Slide

- **Event / Organization Name:** Hacktoberfest HackDay 2026 · E-Cell IIMTU · Track 1: Best Use of Gemma 4 (PS-01)
- **Project Name:** **Meeko — Study Companion from Real Notes** (Evidence-First Tutor)
- **One-line Project Description:** *Learn from your notes. Verify every answer.* An AI tutor that answers only from student-uploaded notes, shows page-tagged evidence, and admits when it doesn't know.
- **Team / Founder:** [...] (team: [...])
- **Organization / Institution:** [...]

**Speaker notes:** "Hi — ye hai Meeko. Ek line me: jo aapke notes me nahi hai, Meeko wo jawab nahi dega, chahe kitna bhi confident lage."

---

## Slide 2 — The Problem

- **Problem Statement:** Students revise from short PDFs and messy lecture notes. Generic chatbots answer from their *own memory* even when the notes don't contain the answer — learners **can't tell what's supported vs. invented**.
- **Why It Matters:** Wrong confidence the night before an exam · no way to trace a claim back to a page in the notes · no feedback on what was actually misunderstood.
- **Current Workarounds / Evidence:** ChatGPT-style chat + manual self-quizzing — neither grounds answers in *your* material nor verifies citations. Live proof: identical questions flip between SUPPORTED-with-page and NOT_FOUND depending on which notes are uploaded — chatbots do this silently, Meeko shows it openly.

**Speaker notes:** "Ye statistics nahi, experience hai — sabne ye feel kiya hai ki chatbot confidently jhooth bolta hai."

---

## Slide 3 — Proposed Solution

- **Solution Overview:** A NotebookLM-style study workspace — upload PDF / paste text / add a link → one **Notebook** per document → ask, get a grounded answer with **verified page-tagged evidence**.
- **How It Works:**
  ```
  Notes (PDF/TXT/MD/URL) → page-wise chunking (p.N tags)
    → embeddings (LM Studio; TF-IDF fallback)
    → question retrieves top-k chunks (optionally scoped by source checkboxes)
    → Gemma 4 answers ONLY from those chunks + citation IDs
    → CODE verifies every quote is a real substring of the notes
    → ✅ render with page tags  |  ❌ else forced NOT_FOUND
  ```
- **Core Features:**
  - Auto **Briefing** (bold key terms) + 3 suggested questions on notebook open
  - **Ask** chat — citation chips click-jump to the exact PDF page with flash highlight
  - **Quiz** (MCQ + short-answer, embedding-similarity grading, hints; blank answers auto-fail) · **Flashcards** (flip/shuffle) · **Explain** (3 levels) · **Audio Overview** (two-host script + browser TTS, zero cost)
  - **Source checkboxes** scope every tool to selected files · multi-file notebooks with per-file page numbers
  - Real PDF viewer (`#page=` deep links, zoom, fullscreen), Notes & Highlights tabs, Ctrl+K search, dark mode, clean URL `/notebook/{uuid}`
- **Expected Impact:** Revision time → answers traceable in seconds · Accuracy → zero invented citations *by construction* · Access → runs fully offline on LM Studio at ₹0 cost.

**Speaker notes:** "Innovation simple hai: honesty enforced by code, not by prompt. Evidence chip pe click karo — PDF usi page pe jump karta hai."

---

## Slide 4 — Target Users

- **Primary Users:** College students revising 2–5 pages of notes the night before an exam (1st/2nd-year, any subject).
- **Needs and Pain Points:** *"Kya ye jawab sach mere notes me hai?"* · need practice questions with real feedback · honest handling of wrong answers instead of a red cross.
- **Secondary Stakeholders:** Judges/mentors (verify every claim live via evidence + retrieval scores) · teachers (see which concepts students get wrong) · study-group admins (shareable notebooks).
- **Initial Reach:** HackDay judges as first pilots · demo topics shipped in `samples/` (Photosynthesis, leph101 Physics Ch.1) · one-topic demos to class groups.

**Speaker notes:** "Demo persona simple hai — student raat ko notes padh raha hai, usko ek sawaal ka jawab chahiye with proof."

---

## Slide 5 — AI Component

- **AI Model / Tool:** **Gemma 4 (`google/gemma-4-e2b`)** served locally via **LM Studio** (OpenAI-compatible `:1234`) · embeddings `text-embedding-nomic-embed-text-v1.5` · Google AI Studio as fallback (`GEMMA_API_KEY`).
- **Why This Model?:** Open-weight (Track-1 requirement) · local inference = privacy + offline demo · strong instruction-following for JSON-mode Q&A, quiz, and grading · zero API cost.
- **Role of AI:** Grounded answer synthesis · briefing + question suggestion · quiz generation and short-answer judging (similarity thresholds: 0.72 correct / 0.55 partial) · explain levels · flashcard mining · two-host audio script. **Retrieval, citation validation, and scoring stay in deterministic code — never in prose.**
- **Implementation and Validation:** Substring citation gate (unverified quote → forced NOT_FOUND) · blank-answer short-circuit (no hallucinated passes) · fallback ladder LM Studio → AI Studio → extractive mode so the demo never dies · validated live: grounded briefing with bolds, 3 real suggested questions, scoped ask `SUPPORTED c5/file 1`, 10-line audio dialogue · `npm run build` green.

**Speaker notes:** "Prompt instruction toot sakta hai — substring gate nahi tootta. Har quote literally notes me search hota hai."

---

## Slide 6 — Technology Stack

| Template line | Stack (deep) |
|---|---|
| **Frontend / User Interface** | **React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4** (via `@tailwindcss/vite`) · `react-router-dom` 7 → clean URL `/notebook/{uuid}` · `react-markdown` for answer rendering · `lucide-react` icons · `oxlint` + `tsc -b` gates every build. Components: hero + creation popup, workspace chat, **real PDF viewer** (`#page=` deep links + flash highlight), action cards, flashcards (flip/shuffle), audio player, dark mode, Ctrl+K search (`frontend/src/`) |
| **Backend / API** | **Python 3 + FastAPI + uvicorn** — **16 REST endpoints**: ingestion (`/api/notes/upload|text|url|sample`), tutoring (`/api/tutor/ask`, `/api/tutor/explain`, `/api/suggest`), assessment (`/api/quiz/generate`, `/api/quiz/evaluate`, `/api/flashcards`), media (`/api/audio`), raw evidence (`/api/files/{nb}/{idx}`, `/api/chunks/{nid}/{cid}`), `/api/health`. Clean module split: `main.py` (API) · `tutor.py` (grounded answers, quiz, grading) · `rag.py` (chunking + retrieval) · `llm.py` (model clients + fallback ladder) |
| **AI / Machine Learning** | **Gemma (`google/gemma-4-e2b`) served 100% local via LM Studio** on an OpenAI-compatible server (`:1234/v1`) — chat + `/v1/embeddings` on the same port · embeddings `text-embedding-nomic-embed-text-v1.5` · temperature 0.3 for reproducible answers · cloud fallback Google AI Studio (`gemma-3-27b-it`, `GEMMA_API_KEY`) · AI is used for: answer synthesis, briefing, question suggestion, quiz generation, 3-level explain, flashcard mining, two-host audio script — **but retrieval, citation-checking and scoring stay in deterministic code, never in the prompt** |
| **Database / RAG** | **Ingestion:** `pypdf` text extraction **per PDF page** → paragraph-aware chunking (**700 chars, 120 overlap**) with `· p.N` page tags → **MD5-hashed per-notebook embedding cache** (`EMB_CACHE`) so a 40-page PDF embeds once, not per question. **Retrieval:** pure-Python cosine top-k (no numpy/sklearn — deliberately avoids the numpy2 conflict) → **TF-IDF fallback** (smoothed idf `(n+1)/(df+1)`) when the embedding model is absent → **substring citation gate: every quote the LLM produces must literally exist in the retrieved chunk, else forced NOT_FOUND.** **Storage:** in-memory store keyed by `notebook_id` + `localStorage` persistence (`sc-notebooks-v2`) — no vector DB needed at 2–5-page-note scale |
| **Hosting / DevOps** | **Zero cloud, zero cost, fully offline.** One command `start.bat` boots backend (:8000 uvicorn) + frontend (:5173 Vite) + opens the browser; `stop.bat` kills both · `npm run build` = `tsc -b && vite build` (type-safe CI gate) · MIT license on GitHub · versioned via `CHANGELOG.md` (**v0.7.2 → v0.16.0**, all verified builds) · explainer video rendered with HyperFrames (`videos/meeko-explainer/renders/video.mp4`) |

**Why this stack (the 3-line pitch):**
- **Local-first = privacy + ₹0 + offline demo** — student notes never leave the machine; judges can unplug Wi-Fi mid-demo.
- **Deterministic safety net under the AI** — embeddings → TF-IDF → extractive, and citation gate in code: the demo degrades gracefully but **never fabricates**.
- **Deliberately boring infra** (in-memory store, no vector DB, no Docker) so the *innovation — evidence-enforced honesty —* stays the star.

**Speaker notes:** "Ek command pe poora stack chalta hai — `start.bat`. Demo ke liye koi cloud dependency nahi. Depth me: chunking page-wise hoti hai taaki har citation `p.N` tag ke saath aaye, embeddings per-notebook MD5-cache se hoti hain, aur retrieval ka order hai — LM Studio embeddings, warna TF-IDF, warna extractive. LLM jo quote deta hai, wo code literally notes me search karta hai; match nahi hua to NOT_FOUND. Hallucination prompt se nahi, architecture se roka gaya hai."

**Likely judge Q&A (tech depth):**
- *"Why not a vector DB (Pinecone/Chroma)? At this scale it's dead weight — a 2–5 page note is ~10–40 chunks; an in-memory cosine sort is <5 ms and needs zero setup. We'd add one the moment it's a multi-note library."*
- *"Why LM Studio over an API? Track-1 needs open-weight Gemma; local inference gives privacy, offline demo, and ₹0 cost — plus the OpenAI-compatible `:1234` API means swapping models is a dropdown, not a rewrite."*
- *"What if the LLM ignores instructions and hallucinates? It can — and we don't care: the substring gate is code, not prompt. An unverified quote is physically rendered as NOT_FOUND."*
- *"Why no user accounts/database? Deliberate scope: single-topic revision is the problem statement; auth would steal weeks from the grounding innovation. Store is in-memory + localStorage, enough for the demo."*

---

## Slide 7 — Links & References

- **Project Demo:** Run `start.bat` (live app at `localhost:5173`) · Demo video: `videos/meeko-explainer/renders/video.mp4` (54.5s Hinglish explainer)
- **Code Repository:** [...] (MIT — contains `frontend/`, `backend/`, `samples/`, `videos/`)
- **AI Documentation:** Gemma model card + licence — https://ai.google.dev/gemma · LM Studio docs — lmstudio.ai
- **Research / Datasets:** `PRD-PS01.md` · `PLAN-PS01.md` · `CHANGELOG.md` (v0.7.2 → v0.16.0, all verified builds) · `README.md` (grounding + honest limitations) · sample notes `samples/photosynthesis.md` · PROBLEM STATEMENTS.pdf (PS-01, p.4)
- **Contact:** [...] (email / GitHub / LinkedIn)

**Speaker notes:** "Live demo ready hai — `start.bat` double-click. Questions?"

---

### One-liner for title/closing slide
**Learn from your notes. Verify every answer.**
