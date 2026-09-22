# Brag Plan: Seltiv SLMS

## What is this app?
A Student Lifecycle Management System that runs admissions, attendance, academics, finance, and parent communication for all four schools of the Sheikh Farid Ahmed Education and Welfare Trust — one codebase, but each branch keeps its own process and its own database, no shared tenancy.

## The angle
Not a hype product — a real, working back-office system for a real school trust, shown running. The angle is quiet competence: four portals (admin, teacher, parent, accounts), one design language, real screens doing real jobs — roll call, grading, bKash fee payment, admissions. Let the UI carry the story; no invented features, no claims beyond what's built.

## Hook (first 2-3 seconds)
The wordmark "Seltiv SLMS" on the app's own warm paper-white background, serif display type, with the one-line premise underneath: "One platform. Four schools." Quiet, confident, no motion tricks — just a clean type reveal.

## Key moments (the middle)
- The admin dashboard — the command center: students, admissions, finance, attendance all visible from one screen.
- A teacher taking roll call — the actual working screen, not a mockup, showing attendance being marked class by class.
- A parent paying school fees via bKash — the real payment flow, the product closing the loop from classroom to cashbox.

## Outro / punchline
Wordmark returns, tagline resolves: "Built for the Sheikh Farid Ahmed Education and Welfare Trust." No CTA, no urgency — it lands like a plaque, not an ad.

## User flow worth showing
Three real screens from the actual running app (captured via Playwright against the seeded demo data), not landing-page copy:
1. Admin dashboard — entry point, the operational overview.
2. Teacher roll call — a key action, attendance being taken.
3. Parent fee payment (bKash) — the result, money collected, loop closed.

## Tone
- Preset: polished
- Creative direction: quiet premium product film — an editorial, "Broadsheet" feel matching the product's own design system (serif display type, warm paper background, restrained teal/magenta accents)
- Interpretation: 4 scenes, longer holds (4-5s each), slow crossfades, no aggressive typography. Confidence through restraint — the product doesn't need to shout because the screens speak for it.

## Format: landscape — 1920x1080
## Duration: ~20 seconds

## Visual identity (from the project)
- Background: #faf9f5 (warm paper white)
- Accent: #0088b0 (teal), #d6006c (magenta, secondary)
- Text: #201e1d (near-black ink)
- Display font: Source Serif 4 (Google Fonts)
- Body font: system sans-serif stack
- Strongest visual element: the real captured UI screens (screenshots/01-admin-dashboard.png, 11-teacher-rollcall.png, 24-parent-fees.png) framed as browser-chrome cards with a slow Ken Burns drift

## Share copy (draft)
Seltiv SLMS: one platform for admissions, attendance, academics, finance, and parent communication across all four Sheikh Farid Ahmed Trust schools.

## Audio direction
- Role: sparse professional accents over a quiet music bed
- Music: happy-beats-business-moves-vol-12-by-ende-dot-app.mp3 (steady, clean — matches `polished`/`cinematic`)
- Music treatment: fade in over 0.6s from silence, hold at 0.3, fade out over the last 1s under the outro
- Music cue guidance: read from bundled preset `<skill-dir>/assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`; use at most 1-2 strong cues near the Scene 2 dashboard reveal (~3.5s) and the outro wordmark return (~16.5s); everything else natural timing, restraint per `polished` tone
- Audio-reactive treatment: subtle — a soft glow/presence breathe on the active screenshot card tied to music RMS, nothing else
- SFX posture: sparse — 2-3 cues total (soft reveal drop on Scene 2, gentle card sound on each screenshot swap)
- Audio-coupled moments: Scene 2 card entrance (soft drop), Scene 3a→3b card swap (card-place sound)
- Restraint rule: no aggressive hits, no beat-locked rapid cuts — this is a quiet institutional product, not a startup hype reel

## Storyboard

### Scene 1 — Hook / wordmark — 3.5s
Warm paper-white (#faf9f5) full-bleed background. "Seltiv SLMS" in Source Serif 4, large, ink-colored, centered, fades/slides up gently. Sub-line "One platform. Four schools." fades in 0.6s after.
Sequential/interaction: none
Audio intent: music fades in quietly under the wordmark
Audio-coupled idea: none
Music: quiet fade-in bed starts here
Transition mood: soft crossfade → Scene 2

### Scene 2 — Admin dashboard reveal — 5s
The real admin dashboard screenshot (screenshots/01-admin-dashboard.png) appears inside a minimal browser-chrome card, slow Ken Burns zoom-in (1.0 → 1.05) over the full 5s. Headline overlay top-left: "Admissions to finance — one screen." Card settles by 0.6s in, holds fully readable.
Sequential/interaction: none (single card, slow drift)
Audio intent: confident, grounded — the reveal
Audio-coupled idea: soft drop SFX under the card's entrance at ~0.2s into the scene
Transition mood: soft crossfade → Scene 3a

### Scene 3a — Teacher roll call — 4s
Real screenshot (screenshots/11-teacher-rollcall.png) in the same card treatment, slow drift. Label: "Roll call, taken in class."
Sequential/interaction: none
Audio intent: steady continuation
Audio-coupled idea: gentle card-place sound at the transition in
Transition mood: soft crossfade → Scene 3b

### Scene 3b — Parent fee payment (bKash) — 4s
Real screenshot (screenshots/24-parent-fees.png) in the same card treatment. Label: "Fees, paid by bKash."
Sequential/interaction: none
Audio intent: resolution — the loop closes
Audio-coupled idea: gentle card-place sound at the transition in
Transition mood: soft crossfade → Scene 4

### Scene 4 — Outro — 4s
Return to the paper-white background. Wordmark "Seltiv SLMS" resolves centered again, smaller, with tagline "Built for the Sheikh Farid Ahmed Education and Welfare Trust." beneath it. Long hold on empty space, no CTA.
Sequential/interaction: none
Audio intent: music fades out under the final hold
Audio-coupled idea: none
Transition mood: hold → end

**Music mood for this video:** polished / cinematic — steady, clean, understated
**Audio summary:** a quiet, warm music bed fades in under the wordmark, holds low through the three screen reveals with two soft card-transition accents, and fades out under the closing wordmark — restraint throughout, nothing beat-locked or aggressive.
