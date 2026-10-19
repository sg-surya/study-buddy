# HackDay Intro Video — 2:00 Script
**Meeko / Study Companion (PS-01) · motion graphics + real app mockups · theme = app theme**

- **Length:** 120s exactly · **16:9, 1920×1080**
- **Theme:** cream `#FFFCF8` · ink `#201C19` · Meeko orange `#FF5A1F` — same type feel as the app (big tight-tracked headlines, subtle hatch texture, rounded cards)
- **Animation style:** reuse the app's own motion — horizontal strip wipe (upload), pipeline step reveal, card rise-in, citation chip pop, flip (flashcards)
- **Audio:** Hinglish VO (AI voice or your own) + light electronic lo-fi bed; SFX on strip wipe, stamp, chip pop
- **Format:** Screen-record the real app for mockup shots; overlay motion graphics (type, cards, pipeline diagram) on brand-color fields between shots

---

## Scene 1 — Hook (0:00 – 0:10)

- **Visual:** Cream field, faint diagonal hatch. Giant ink type slams word-by-word: **"KAL EXAM HAI."** Small note cards fan in behind, low opacity. Timer chip `00:00:59:59` ticks in orange.
- **VO:** "Kal exam hai. Notes ready hain. Par ek sawaal ka jawab — notes mein hai bhi ya nahi?"
- **SFX:** type slam per word · timer tick

## Scene 2 — Problem (0:10 – 0:24)

- **Visual:** Motion-graphic chat box (rounded, cream card, ink border) types a question. Answer streams in confident — then half the text **cracks and falls away**, orange **CONFIDENT** stamp slams over it. Side rail: real notebook PDF sitting closed/dim.
- **VO:** "Aaj ka chatbot poochho to turant jawab dega — confident. Par aadha jhooth, kyunki usne tumhare notes khole hi nahi."
- **SFX:** stamp thud

## Scene 3 — Title / Reveal (0:24 – 0:32)

- **Visual:** Notes flip open, orange bookmark slides in, wordmark assembles: **meeko.** — tagline types below: **Learn from your notes. Verify every answer.** Corner badge: *Hacktoberfest HackDay 2026 · PS-01 · Gemma 4*.
- **VO:** "Meeko — learn from your notes. Verify every answer."
- **SFX:** letter-tick assemble · soft whoosh

## Scene 4 — Real mockup: Create notebook (0:32 – 0:45)

- **Visual:** **Real screen recording** — hero page → CREATE NOTEBOOK popup → drag-drop PDF → orange Create click → **app's own horizontal strip wipe** plays full-screen (Uploading → Parsing → Chunking → Linking → Ready). Zoom cursor on the pipeline steps.
- **VO:** "PDF daalo — ya paste karo, ya link do. Meeko usse padhega, page-wise tukdon me baantega, aur seconds me notebook ready."
- **SFX:** strip wipe sweep

## Scene 5 — Briefing + Ask (0:45 – 1:02)

- **Visual:** **Real mockup** — notebook opens, auto **Briefing** builds line-by-line (bold key terms pop in orange), 3 suggested-question cards rise. Cursor clicks one → answer streams with citation chips `[c2 · p.3]` — **cursor clicks a chip → PDF viewer jumps to that page with flash highlight** (crop + zoom).
- **VO:** "Notebook kholte hi briefing aur sawaal ready. Poochho — har jawab page-tagged saboot ke saath. Chip pe click, seedha us page par."
- **SFX:** chip pop · page-land soft click

## Scene 6 — The machine (motion graphics) (1:02 – 1:18)

- **Visual:** Brand-color field. Minimal **isometric pipeline** builds in sync with VO: `Notes → page-tagged chunks → embeddings retrieve → Gemma 4 core → VERIFIED gate`. Each station lights orange as it's named; at the gate, quote lines check against notes → **VERIFIED** stamps stack. Reuse frames from `videos/meeko-explainer` (frame 04) if you want zero new work.
- **VO:** "Andar ka logic simple hai: notes ke tukde, har tukda page-tagged. Sawaal aate hi sahi tukde. Phir Gemma 4 jawab likhta hai — aur code har quote ko notes me literally search karta hai."
- **SFX:** station blinks · stamp stack

## Scene 7 — Honesty beat (1:18 – 1:28)

- **Visual:** Hard question chip drops in → machine dials pause → everything clears → calm card lands center: **NOT FOUND** in orange on cream, lots of empty space.
- **VO:** "Aur jawab notes me nahi? Meeko guess nahi karta. Saaf kehta hai — NOT FOUND."
- **SFX:** low thud · silence beat

## Scene 8 — Feature cascade (1:28 – 1:44)

- **Visual:** Four cards cascade in (app's card rise-in, rounded, ink border): **Quiz** → wrong answer flips into correct + evidence + hint · **Flashcards** → one card 3D-flips · **Explain (3 levels)** → levels stack · **Audio Overview** → waveform bars bounce. Each card shows a 1–2s real-mockup crop inside it.
- **VO:** "Quiz jo galat jawab par saboot aur hint de. Flashcards, teen levels ki explanations, aur notes se bana audio overview — sab tumhare hi notes se."
- **SFX:** card whoosh ×4 · flip

## Scene 9 — Source scoping proof (1:44 – 1:52)

- **Visual:** **Real mockup, zoomed** — source checkboxes: uncheck file 2 → header hint *"Answering from 1 of 2 sources"* → answer card shows `file 1` evidence. Quick split-compare: checked = different answer source.
- **VO:** "Files select karo — jawab sirf unhi se. Multi-file notebook, per-file pages, poora control."
- **SFX:** checkbox click ×2

## Scene 10 — Close (1:52 – 2:00)

- **Visual:** Cream field → giant lockup: **LEARN FROM YOUR NOTES.** / orange sub-line **VERIFY EVERY ANSWER.** Badge row: *Gemma 4 · runs offline · MIT*. Repo URL + QR bottom-right. Hold 3s.
- **VO:** "Meeko — learn from your notes, verify every answer. HackDay 2026."
- **SFX:** lockup hit · bed fades out

---

## Production checklist

**Screen-record from the live app** (fresh notebook after backend restart, load Gemma in LM Studio first so answers are generative):
1. Hero → Create popup → drag-drop → strip wipe + pipeline steps
2. Notebook open → briefing bolds → suggested question → answer + chip click → PDF jump/highlight
3. Quiz wrong-answer feedback · Flashcard flip · Explain levels · Audio player bars
4. Source checkbox scope hint
   → Zoom/crop in the editor; record at 1080p, cursor visible, dark mode OFF (brand cream).

**Motion-graphics segments:** Scenes 1–3, 6, 7, 10 — pure brand-color fields (or lift frames from `videos/meeko-explainer/renders/video.mp4` for Scene 6).

**VO budget:** ~310 words Hinglish ≈ 118s + beats. Keep pauses tight; if VO runs long, trim Scene 9 to 5s.

**Edit notes:** cuts on beat · strip-wipe (Scene 4) doubles as the transition into Scene 5 · orange used only for proof moments (stamps, chips, VERIFIED, NOT_FOUND) so it stays loud.
