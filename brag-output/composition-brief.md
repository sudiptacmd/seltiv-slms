# Hyperframes Composition Brief: Seltiv SLMS

## Objective
Create a short, polished launch-style brag video for Seltiv SLMS — a Student Lifecycle Management System for a 4-branch school trust.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: ~20.5 seconds

## Source Material
- Project root: /home/goswami/Documents/GitHub/seltiv-slms
- Primary files read: README.md, src/app/globals.css, screenshots/*.png
- Product name: Seltiv SLMS
- Tagline / strongest claim: "One platform. Four schools." / "Built for the Sheikh Farid Ahmed Education and Welfare Trust."
- Key UI or visual moment to recreate: the real captured product screens — admin dashboard, teacher roll call, parent bKash fee payment — shown as browser-chrome cards with a slow Ken Burns drift
- Copy that must appear verbatim:
  - Seltiv SLMS
  - One platform. Four schools.
  - Admissions to finance — one screen.
  - Roll call, taken in class.
  - Fees, paid by bKash.
  - Built for the Sheikh Farid Ahmed Education and Welfare Trust.

## Creative Direction
- Tone preset: polished
- Creative direction: quiet premium product film, editorial "Broadsheet" feel matching the product's own design system
- Interpretation: restraint over hype — 4 scenes, 4-6s holds, slow crossfades, no aggressive typography or fast cuts
- Angle: a real, working back-office system shown running — not hype, quiet competence, real screens doing real jobs
- Hook: wordmark + tagline on the product's own paper-white background
- Outro / punchline: wordmark returns with the institutional tagline, long hold, no CTA
- Avoid:
  - Generic SaaS language ("streamline your workflow" etc.)
  - Abstract filler visuals
  - Unrelated visual redesign — use the project's real palette/type, not a generic tech-startup look

## Visual Identity
- Background: #faf9f5 (warm paper white)
- Text: #201e1d (near-black ink)
- Accent: #0088b0 (teal, primary), #d6006c (magenta, secondary, sparing use)
- Display font: Source Serif 4 (Google Fonts) — fallback Georgia/serif
- Body font: system sans-serif stack
- Visual references from the project: the real screenshots in `screenshots/` (01-admin-dashboard.png, 11-teacher-rollcall.png, 24-parent-fees.png), the app's own warm/paper editorial design system

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook / wordmark — 3.5s — "Seltiv SLMS" + "One platform. Four schools."
2. Admin dashboard reveal — 5s — real dashboard screenshot, Ken Burns drift, headline "Admissions to finance — one screen."
3a. Teacher roll call — 4s — real screenshot, label "Roll call, taken in class."
3b. Parent bKash fee payment — 4s — real screenshot, label "Fees, paid by bKash."
4. Outro — 4s — wordmark + institutional tagline, long hold

## Audio
- Audio role: sparse professional accents over a quiet music bed
- Audio arc: fade in under the hook, hold low through the screen reveals with two soft card-transition accents, fade out under the closing wordmark
- Music: happy-beats-business-moves-vol-12-by-ende-dot-app.mp3
- Music treatment: fade in 0.6s from 0, hold ~0.3 volume, fade out over the last 1s
- Music cue guidance: bundled preset at `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`; bias the Scene 2 dashboard entrance and the Scene 4 wordmark return toward nearby strong cues within ±0.15s if it doesn't hurt readability; otherwise use natural timing
- Audio-reactive treatment: subtle — soft glow/presence breathe on the active screenshot card tied to music RMS/bass only; no waveform/equalizer visuals
- Audio-coupled moments:
  - Scene 2 card entrance — soft drop/reveal SFX
  - Scene 3a→3b card swap — gentle card-place SFX
- SFX selection guidance: match the "polished" energy — 2-3 very subtle SFX total, nothing aggressive (see tone→SFX table: `interface/drop_001` or `_002` for reveals, `interface/bong_001` or `impactSoft_medium_*` for a soft accent)
- SFX analysis guidance: `<skill-dir>/assets/sfx/sfx-analysis.md` — prefer low/medium high-frequency-risk files for these repeated, polished moments
- Exact SFX choice: Hyperframes chooses exact filenames/timestamps/volume based on the implemented animation
- Audio files: copy the chosen music and any selected SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe Ken Burns keyframes for the screenshot cards), and `hyperframes-cli` (lint/check/render). This is `/brag`'s own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI screenshot from `screenshots/` (three are specified above — use all three).
- Keep all text readable in the final render; hold each headline for its reading-time floor.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer unless it materially hurts the polished restraint the tone calls for.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints; ignore cues that hurt readability, scene pacing, or the product story.
- Use only 1-2 strong cue locks in this 20.5s video, consistent with the `polished` tone's restraint.
- Honor the planned fade-in/fade-out music treatment.
- Use local assets for audio and screenshots.
- Run `npx hyperframes check` before render — it is brag's single gate.
