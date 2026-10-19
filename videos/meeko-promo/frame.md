---
version: alpha
name: Meeko Promo — Frame (video / frame layer)
description: >
  Frame system for the Meeko narrated promo (product-launch-video route). The unit is the
  frame (1920×1080). Atoms are the app's own brand: three-surface system (coral fire /
  ink black / warm cream), Anton uppercase display + Space Grotesk body, the 45° diagonal
  hatch, decorative wallpaper numerals, hard color-region splits, zero shadow, zero radius
  (save circles). Real captured app screens are first-class citizens inside frames.
  Motion is out of scope (animation layer owns it).
unit: the frame — 1920×1080 primary
principle: atoms are sacred · composition is free · numbers come from the script

colors:
  coral: "#FF5A1F"
  coral-deep: "#E2542C"
  cream: "#FFFCF8"
  cream-dark: "#FFCEBD"
  ink: "#201C19"
  ink-muted: "#7E7772"
  gray: "#6B6B6B"
  light-gray: "#B0B0B0"
  success: "#2E7D5B"
  error: "#B3341E"

typography:
  # — reading ramp (Space Grotesk) —
  body:          { fontFamily: "Space Grotesk", cqw: 1.05, weight: 400, lineHeight: 1.6 }
  body-medium:   { fontFamily: "Space Grotesk", cqw: 1.05, weight: 500, lineHeight: 1.6 }
  body-light:    { fontFamily: "Space Grotesk", cqw: 1.5,  weight: 400, lineHeight: 1.45, note: "pull-quote voice" }
  section-label: { fontFamily: "Space Grotesk", px: 13, weight: 700, tracking: "4px", upper: true }
  item-label:    { fontFamily: "Space Grotesk", px: 11, weight: 700, tracking: "3px", upper: true }
  # — display ramp (Anton, uppercase, tight) —
  card-title:    { fontFamily: "Anton", cqw: 1.7,  weight: 400, lineHeight: 1.05, upper: true }
  bar-title:     { fontFamily: "Anton", cqw: 2.1,  weight: 400, lineHeight: 1.0, upper: true }
  column-title:  { fontFamily: "Anton", cqw: 3.2,  weight: 400, lineHeight: 1.0, upper: true }
  section-headline:{ fontFamily: "Anton", cqw: 3.7, weight: 400, lineHeight: 1.0, upper: true }
  stat-numeral:  { fontFamily: "Anton", cqw: 4.5,  weight: 400, lineHeight: 1.0, upper: true }
  hero-title:    { fontFamily: "Anton", cqw: 5.6,  weight: 400, lineHeight: 0.92, upper: true }
  jumbo-feature: { fontFamily: "Anton", cqw: 7.6,  weight: 400, lineHeight: 0.95, upper: true }
  # — decorative —
  background-numeral: { fontFamily: "Anton", cqw: 9.5, weight: 400, color: "rgba(32,28,25,0.10)", note: "wallpaper numeral" }
  giant-mark:    { fontFamily: "Anton", cqw: 13.0, weight: 400, color: "rgba(32,28,25,0.32)" }

spacing:
  pad-x: "5cqw"
  pad-y: "4cqw"
  pad-col: "3cqw"
  gap-grid: "1.7cqw"
  card-pad: "2cqw"

components:
  diagonal-hatch:
    backgroundImage: "repeating-linear-gradient(45deg, transparent 0 20px, rgba(32,28,25,.06) 20px 40px)"
    placement: "::before overlay on coral regions"
  region-split:
    layout: "solid surfaces meeting at a hard edge; 38/62, 40/60, 50/50"
  card:
    backgroundColor: "{colors.cream}"
    borderTop: "0.26cqw solid {colors.coral}"
    shadow: "none"
  sidebar-item:
    backgroundColor: "{colors.ink}"
    borderLeft: "0.2cqw solid {colors.coral}"
  accent-line:
    backgroundColor: "{colors.coral}"
    size: "4cqw × 0.25cqw"
  stamp:
    border: "0.22cqw solid {colors.success}"
    textColor: "{colors.success}"
    note: "VERIFIED / SUPPORTED mark — rotated −8°, Space Grotesk 700 tracked caps inside a 2px ring; the promo's motif"
  evidence-strip:
    backgroundColor: "{colors.cream}"
    borderLeft: "0.25cqw solid {colors.coral}"
    note: "page-tagged quotation strip (p·N chip in coral) — appears in verification beats and inside real UI"
  app-screen:
    treatment: "real captured PNG in an ink 2px frame, 0 radius, flat; scale 0.5–0.9 cqw-relative; no shadow, no tilt beyond ±1.5°"
---

# Meeko Promo — Frame

## Brand adaptation (READ FIRST)

This is the app's Coral-adjacent brand at **poster/ documentary** scale. The frontmatter is
normative: coral #FF5A1F / cream #FFFCF8 / ink #201C19, Anton declares, Space Grotesk explains,
hatch + wallpaper numerals carry texture, real app screens are treated as ink-framed artifacts.

- Ink-on-fire (never white on coral). Eyebrows coral on cream/ink, ink on coral.
- Flat: no shadow, no elevation, radius 0 except circles.
- Anton is uppercase display only, line-height ≤ 1.05, tracking 0–2px (it is already heavy).
- Real UI beats lean on the captured screens; type frames support them, never compete.

## Scene brief (numbers from SCRIPT.md — 320 words ≈ 124s VO)

| # | Scene | Ground | Treatment | VO beat |
|---|-------|--------|-----------|---------|
| 1 | hook | ink | jumbo-feature type slam, cream on ink | "Every student has faced this situation." |
| 2 | exam-night | cream | scattered PDF cards + clock wallpaper numeral | night before exam, scattered notes |
| 3 | ai-ask | ink | chat bubbles (question → confident answer) | students turn to AI |
| 4 | not-in-notes | coral | jumbo question ink-on-coral + hatch | "What if the answer isn't in their notes?" |
| 5 | hallucination | cream | confident answer card, missing stamp, wallpaper "HALLUCINATION" | convincing ≠ grounded |
| 6 | meeko-reveal | coral | MEEKO hero slam + subtitle band | "That's where Meeko comes in." |
| 7 | real-start | ink | real shots 01–03 (hero → modal → notebook+briefing), ink-framed | upload PDFs, notebooks, ask |
| 8 | process | cream | timeline: pages → chunks → retrieve → Gemma 4 | page by page, Gemma 4 grounded |
| 9 | verifies | coral | "IT VERIFIES THEM." + VERIFIED stamp motif + evidence strip | the real innovation |
| 10 | evidence-jump | ink | real shots 04–05: chips + page-tagged sources → PDF 3/44 | citations checked, jump to page |
| 11 | honest-no | cream | real shot 06 NOT_FOUND + error callout | clear NOT FOUND |
| 12 | tools | cream | 3-col catalog cards: quiz / flashcards / audio | quizzes, flashcards, audio overviews |
| 13 | spec-bar | ink | three sidebar items: Gemma 4 · LM Studio local · privacy | powered by, transparent, private |
| 14 | goal | quote 40/60 | pull-quote (coral giant-mark panel + ink panel) | the goal isn't faster answers |
| 15 | close | cream + coral band | lockup MEEKO · "Learn from your notes. Verify every answer." · HackDay 2026 | Introducing Meeko |

Anchors vary (center → left → right…); no 3 consecutive frames share an anchor. All numerals in
frames trace to the script or the real UI (page 3/44, etc.).

## Numerals & Claims (hard rule)

Only script- or screen-traced figures. No invented stats. NOT_FOUND, Gemma 4, LM Studio render
exactly as named.
