# brag-plan — Meeko launch video (VO edition)

**Route:** brag skill (brag-slim) · **Source:** project dir `E:\ps1` (Meeko study companion app)
**Request:** English voice-over + visuals + motion graphics, brag skill only
**Format:** landscape 1920×1080 · 30fps · 23.3s · brand #FF5A1F / #FFFCF8 / #201C19 · Anton + Space Grotesk

## Angle

Evidence-first honesty, told at brag pace. Every claim on screen is a real, shipping
feature of the app; hero visuals are real captured app UI, never mockups.

## Story (6 beats)

| # | Scene | What happens | VO |
|---|-------|--------------|----|
| 1 | Hook (0–3.2s) | Type slam: "YOUR CHATBOT NEVER OPENED YOUR NOTES." | "Every AI answer sounds confident." |
| 2 | Reveal (3.2–6.2s) | meeko. wordmark + tagline + note cards | "So we built Meeko." |
| 3 | Real UI (6.2–11.7s) | Real app: hero → create-notebook modal click → uploaded briefing | "It reads your own PDFs first." |
| 4 | Proof (11.7–16.5s) | Real answer + citation chip, cursor clicks the page proof | "Then answers with verified, page-tagged proof." |
| 5 | Honesty (16.5–19.5s) | NOT_FOUND: real chat screenshot, no-evidence question answered honestly | "And it never, ever guesses." |
| 6 | Outro (19.5–23.3s) | Lockup + tagline + Hacktoberfest HackDay 2026 · PS-01 · Gemma 4 badge | "Meeko. Free, open source, on GitHub." |

## Voice-over

- Local Kokoro TTS, voice `am_michael`, en, speed 1.05 — 6 clips, 13.2s total
- VO **complements** the on-screen type (no duplicated lines); narration bridges scene cuts
- Mixed above a custom score: music at 0.65, VO full

## Sound

- Custom 23.3s C-minor score (`work/music.py`) — hats-only hook, beat entry, arp drive,
  outro resolve; regenerated to the new 23.3s grid
- Scene-synced SFX in-score: pop on hook→reveal, whoosh into real-UI + proof + outro,
  pop on the citation-chip click (12.95s), thud on NOT_FOUND (16.55s), kick+pluck resolve

## What shipped

`brag.mp4` (23.3s, poster baked as frame 0) · `brag.jpg` · `share-copy.txt` · this plan
Quality gates: hyperframes check 0 errors/0 warnings, contrast 17/17 AA, 8-frame snapshot
review, audio peak −2.7 dB. Source project: `work/hf/`, score generator: `work/music.py`.
