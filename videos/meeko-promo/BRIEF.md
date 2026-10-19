---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Meeko turns your own notes into evidence-first study — every answer verified, page-tagged, honest"
destination: youtube
aspect: 1920x1080
language: en
length: 170s
angle: evidence-first-honesty
---

## Intent

Narrated promo for Meeko — Study Companion (PS-01, Hacktoberfest HackDay 2026, Gemma 4),
built from the user's pasted script. Problem-first story: exam night, scattered PDF notes,
students asking AI and risking confident hallucinations — then Meeko: notebooks grounded in
the student's own uploads, Gemma 4 answers with citations that are *verified* against the
source by deterministic code, page-tagged chips that jump the built-in PDF viewer, and a clear
NOT_FOUND when the notes don't support an answer. Closes on quizzes, flashcards, audio
overviews, privacy-conscious local inference, and the lockup "Introducing Meeko.
Learn from your notes. Verify every answer."

Tone: calm, confident, honest — closer to a product documentary than a hype ad. The app's own
theme carries every frame: brand #FF5A1F / cream #FFFCF8 / ink #201C19, Anton display +
Space Grotesk body, hatch texture, Lucide-style line icons, no emojis.

Autonomous run: user said "make it best, keep an English voiceover, do everything nicely"
— build end to end, no review gates.

Actual after TTS: 15 Kokoro clips (am_michael, en, speed 1.0) = 142.8s VO; scene grid with
~1s breathing gaps + music ring-out → root duration 170s (2:50), inside the route's ~3min cap.

## Assets

- SCRIPT.md — the user's pasted script, verbatim voice-over copy (English)
- E:\ps1\brag-output\work\shots\01-hero.png — real landing hero (1920x1080)
- E:\ps1\brag-output\work\shots\02-popup.png — real create-notebook modal (1920x1080)
- E:\ps1\brag-output\work\shots\03-notebook-briefing.png — real notebook + auto briefing + suggestions (1920x1400)
- E:\ps1\brag-output\work\shots\04-answer.png — real SUPPORTED answer with c2/c4 chips + page-tagged sources (1920x1400)
- E:\ps1\brag-output\work\shots\05-evidence-jump.png — real chip-click jump, page counter 3/44 (1920x1400)
- E:\ps1\brag-output\work\shots\06-notfound.png — real NOT_FOUND honesty answer (1920x1400)
- E:\ps1\brag-output\work\assets\pdfpage3-crop.png — real NCERT page 3 raster (gold-leaf electroscope)
- E:\ps1\brag-output\work\assets\fonts\ — self-hosted Anton 400 + Space Grotesk 400/500/700 (latin woff2)
- E:\ps1\brag-output\work\music.py — numpy lo-fi score generator (C-minor bed + scene SFX), regenerate at narration length

## Customizations

- VO_MODE: script used verbatim as voice-over (English, local TTS via media-use engine)
- Feature the real captured app screens as the product beats (show-it moments inside a sell story)
- Music bed ducked under VO, scene-locked accents on the verification + NOT_FOUND beats

## Notes

- This is the long narrated piece; the 20s unnarrated brag clip already exists in E:\ps1\brag-output\ (do not rebuild it)
- No fake claims, no emojis — only features the app actually has
- Headless-Chrome quirk: native PDF <embed> does not repaint after src change — composite the page raster over the blank viewer region (proven workaround)
