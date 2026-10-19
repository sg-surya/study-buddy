# brag-plan.md — Meeko launch video

**Input:** Project — `E:\ps1` (Meeko / Study Companion from Real Notes, PS-01).
**Deliverable:** `brag.mp4` (1920×1080, 30fps, ~20s) + `brag.jpg` poster + `share-copy.txt`.

## What it is (one sentence)
Meeko is an evidence-first study tutor: you upload your notes, and it answers *only* from them — every claim page-tagged with proof, and an honest "NOT FOUND" when the answer isn't in your notes.

## Who it's for / what it does
College students revising 2–5 pages of notes the night before an exam — and HackDay judges who want to verify every claim.

## What sets it apart
Generic chatbots answer from their own memory; Meeko's answer is verified **in code** — every quote must be a literal substring of your notes or it's refused. Citations are checked, not claimed.

## Most impressive claim
"One question. Two notebooks. Same chatbot gives a page-tagged answer — or NOT FOUND. Never a hallucination."

## Visual hook
The app's own cream/orange/ink identity: giant tight-tracked type slamming in on `#FFFCF8`, then **real app UI** — the citation chip click that jumps the PDF viewer to the evidence page.

## Real UI shown (screen captures from the live app)
1. Hero + Create Notebook popup (entry)
2. Notebook open: briefing + suggested questions (key action)
3. Answer card with `[c2 · p.3]` evidence chip → cursor click → PDF viewer page jump (result)
4. NOT FOUND refusal card (the honesty beat)

## Tone
`default` — punchy, playful, clean. 4–5 scenes, soft transitions, motion graphics in brand tokens; real UI does the heavy lifting.

## Share caption (one line)
"Your chatbot never opened your notes. Meeko does — every answer with a page number, or an honest NOT_FOUND."

## Storyboard (durations sum to 20s)

| # | t | Scene | Content | Motion |
|---|---|---|---|---|
| 1 | 0.0–2.5 | Hook | Cream field, hatch. Giant ink type slams word-by-word: **"YOUR CHATBOT NEVER OPENED YOUR NOTES."** | word-by-word slam, timer-orange period |
| 2 | 2.5–5.3 | Reveal | Notes flip open (graphic), **`meeko.`** wordmark assembles letter-by-letter; tagline types: *Learn from your notes. Verify every answer.* | letter tick-in, orange bookmark slide |
| 3 | 5.3–10.3 | Real UI — entry | Real screenshots: hero → **Create Notebook popup** → orange strip-wipe ("NOTEBOOK READY") → notebook **briefing** building with bold key terms | Ken Burns on shots, simulated cursor, strip wipe (the app's own transition language) |
| 4 | 10.3–15.0 | Real UI — proof | Real answer card: cursor clicks **`[c2 · p.3]` chip** → shot 2: PDF viewer lands on that page with flash highlight; caption "click the proof." | cursor move + chip pop + page-flash |
| 5 | 15.0–17.3 | Honesty | Crop of the **NOT FOUND** card center, big empty space; line: "Not in your notes? Then it's NOT_FOUND." | calm single move, low thud |
| 6 | 17.3–20.0 | Outro | Lockup: **meeko.** + LEARN FROM YOUR NOTES. / VERIFY EVERY ANSWER. + badge "Hacktoberfest HackDay 2026 · PS-01 · Gemma 4" | settle, still hold |

## Sound
One piece, key of C-minor feel but bright: soft lo-fi kick/hat groove + warm pluck arpeggio; effects share the space — whoosh on the strip wipe (scene 3), chip pop (scene 4), low thud on NOT FOUND (scene 5), final lockup hit with tail. Nothing harsh; repeated ticks sit low.

## Brand truth (from source)
- Colors: brand `#FF5A1F`, cream `#FFFCF8`, ink `#201C19` (from `frontend/src/index.css` `@theme` tokens)
- Type feel: big tight-tracked display headlines, subtle diagonal hatch, rounded cards
- No emojis; Lucide-style line icons only; copy uses the app's own lines (tagline, NOT_FOUND, HackDay badge)
