# Brag Plan: Seltiv SLMS

## What is this app?
A Student Lifecycle Management System — four role-specific portals (school office, teacher, parent, accounts) covering admissions, attendance, academics, finance and parent communication, built to be run once per branch for any school with more than one location, not tied to a single institution.

## The angle
A quiet, confident product film — not a startup pitch. The angle is "four jobs, four screens, one system": rather than one generic dashboard, the video tours each of the four portals in turn, showing that each role gets an experience built for exactly what they need, backed by real bKash payments and automatic SMS. This is the "detailed" cut: longer than a typical brag, built to actually walk through all four portals instead of a single highlight reel.

## Hook (first 2-3 seconds)
Paper-white background (the app's own `#faf9f5`), the wordmark "Seltiv SLMS" resolves in serif type, then the headline locks in: "Your whole school. On one screen." — the exact line from the product's own marketing page, not invented copy.

## Key moments (the middle)
- The school office portal: the admin dashboard's real branch numbers, then the admissions pipeline — "every application, one pipeline."
- The teacher portal: roll call being taken (attendance toggles), then the gradesheet — "mark it once, the report card updates itself."
- The parent portal: the fees screen with a real bKash checkout, then the dashboard — "pay from a phone, no bank queue."
- The accounts portal: bKash reconciliation matching a transaction automatically, then the financial report — "the ledger closes itself."

## Outro / punchline
Wordmark returns, centered, small — quiet close, no CTA, no urgency. Final line: "Built for every school." It lands like a plaque, matching the polished tone of the rest of the video.

## User flow worth showing
Four short flows, one per portal, each an entry → key screen → payoff beat:
1. School office: open the dashboard → open Admissions → see the pipeline stages.
2. Teacher: open a class → tap through roll call → an absence is marked, the SMS-sent state is implied.
3. Parent: open the dashboard → open Fees → the bKash payment confirms.
4. Accounts: open bKash Reconciliation → a transaction auto-matches → open Reports.

## Tone
- Preset: polished
- Creative direction: quiet premium product film — the kind of video a school's board would find reassuring, not hyped
- Interpretation: Fewer, longer holds; soft crossfades; restrained typography-led motion; confidence comes from calm pacing, not speed. Even at 45 seconds, no scene should feel rushed — this cut earns its length by actually finishing each portal's beat, not by adding filler.

## Format: landscape — 1920x1080
## Duration: 45 seconds (explicit override — user asked for a longer "detailed" cut this time, covering all four portals rather than the ~20s highlight reel from the previous brag run; every extra second goes to finishing a portal's story, not to padding)

## Visual identity (from the project)
- Background: `#faf9f5` (warm paper-white)
- Surface: `#ffffff`
- Ink (text): `#201e1d`
- Muted text: `#6b6866`
- Accent (primary, teal): `#0088b0`
- Accent 2 (magenta): `#d6006c`
- Yellow (tertiary): `#edbb00`
- Display font: Source Serif 4 (headings/wordmark)
- Body font: system sans-serif stack (ui-sans-serif, system-ui, Segoe UI, Roboto)
- Strongest visual element: the real product screenshots in `screenshots/` — browser-chrome-framed, slightly tilted, exactly as used on the product's own marketing page (`marketing/index.html`) — reuse that framing language for brand consistency.

## Share copy (draft)
Four portals. One school system. Seltiv SLMS runs admissions, attendance, academics, finance and parent communication — reproducible for any school running more than one branch.

## Audio direction
- Role: warm, confident instrumental bed with sparse, professional accent SFX
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (bundled, 60.00s runtime — comfortably covers the 45s cut with room to fade, ~109.96 BPM, beat-interval ≈0.545s)
- Music treatment: enter under the hook at moderate volume, hold steady through the portal tour, a gentle swell into the accounts/ledger beat, soft fade-out under the outro's last ~2s
- Music cue guidance: bundled preset covers 0–~24.6s of the beat grid (strong cues at 20.19s, 20.74s, 21.83s, 22.92s, 24.01s — usable for the teacher→parent transition around that window); for scenes beyond ~25s, extend the same ~0.545s beat interval or re-detect via `npx hyperframes beats` at composition time — this is a polished/restrained video so later cuts should land near a beat, not lock to it exactly
- Audio-reactive treatment: none — restraint fits the tone better than a reactive glow here
- SFX posture: sparse, motion-matched, professional — a soft whoosh on each portal transition, one soft "tick" per sequential UI reveal (roll-call toggle, bKash match), no cartoonish stingers
- Audio-coupled moments: the roll-call attendance toggles arriving one by one (soft tick each), the bKash transaction auto-matching (a single confirm tick), the admissions pipeline stages appearing in sequence
- Restraint rule: never let SFX or music dominate a readable line; no beat-locked text that would need to flash to keep tempo

## Storyboard

### Scene 1 — Hook — 3.5s
Paper-white background. "Seltiv SLMS" wordmark fades/rises in centered, serif type, then the line "Your whole school. On one screen." settles beneath it.
Sequential/interaction: none
Audio intent: music enters clean and confident under the wordmark
Audio-coupled idea: none
Music: warm instrumental bed begins
Transition mood: soft crossfade → Scene 2

### Scene 2 — Sign in — 4s
Real screenshot: `screenshots/00-login.png`, framed in browser chrome, slight tilt (matches the marketing site's `.frame` treatment). Caption line: "One login. Every role sees their own portal."
Sequential/interaction: none
Audio intent: steady bed, no accent yet
Audio-coupled idea: none
Transition mood: soft crossfade → Scene 3

### Scene 3 — School office — 7s
Tag label "For the school office" (accent teal pill, matches site). `screenshots/01-admin-dashboard.png` holds ~3s, then transitions to `screenshots/04-admin-admissions.png` ~3.5s. Line: "Admissions to report cards — one pipeline, not a filing cabinet."
Sequential/interaction: yes — the two screens are a hard-holding sequence, not simultaneous; treat the admissions pipeline's stage columns as arriving with a light stagger if Hyperframes recreates that portion in HTML, otherwise a clean screen-to-screen cut is enough.
Audio intent: bed continues, one soft whoosh on the screen swap
Audio-coupled idea: none required
Transition mood: clean wipe → Scene 4

### Scene 4 — Teacher — 7s
Tag label "For teachers" (accent teal pill). `screenshots/11-teacher-rollcall.png` holds ~3.5s with the attendance toggle row given a light staggered-tick treatment if recreated; then `screenshots/12-teacher-gradesheet.png` ~3.5s. Line: "Roll call takes seconds. Marks reach the report card the same day."
Sequential/interaction: yes — attendance toggles ideally reveal with a soft tick each if the row is recreated in HTML; otherwise treat as a still screenshot with a single soft tick on scene entry.
Audio intent: light rhythmic accent on the toggle beat, stays under the music
Audio-coupled idea: soft tick per toggle (or one on entry if using the static screenshot)
Transition mood: clean wipe → Scene 5

### Scene 5 — Parents — 7s
Tag label "For parents" (accent magenta pill). `screenshots/20-parent-dashboard.png` holds ~3s, then `screenshots/24-parent-fees.png` ~4s with the bKash checkout as the focal point. Line: "Pay from a phone. No bank queue."
Sequential/interaction: none beyond the two-screen sequence
Audio intent: a single confirm-style tick when the fees/bKash screen settles
Audio-coupled idea: one soft "paid" tick timed to the bKash screen's arrival
Transition mood: clean wipe → Scene 6

### Scene 6 — Accounts — 7s
Tag label "For accounts" (neutral/panel pill, matches site's t4 tag). `screenshots/33-accounts-bkash.png` (use the top ~900px of the frame — the same crop already used on the product's own marketing page; this screenshot is a very tall full-page capture and must not be shown uncropped) holds ~3.5s, then `screenshots/34-accounts-reports.png` ~3.5s. Line: "The ledger closes itself."
Sequential/interaction: if the bKash reconciliation table is recreated, one transaction row can visibly flip from "Unmatched" to "Reconciled" with a soft tick; otherwise a still screenshot is sufficient.
Audio intent: gentle swell begins under this scene, building toward the outro
Audio-coupled idea: one match/confirm tick if the reconciliation moment is recreated
Transition mood: soft crossfade → Scene 7

### Scene 7 — Reproducible architecture — 5s
Text-forward beat, no screenshot: three small "branch" cards (own process · own database, matching the product's real architecture and the same visual motif already used on its marketing page) plus a fourth card showing only "+", with the line "Reproducible for any school running more than one branch."
Sequential/interaction: yes — the three branch cards arrive one by one (light stagger, ~0.15-0.2s apart), the "+" card settles last.
Audio intent: swell continues, one soft tick per card arrival, softening into the outro
Audio-coupled idea: three light ticks, one per branch card
Transition mood: soft crossfade → Scene 8

### Scene 8 — Outro — 4.5s
Return to paper-white. Wordmark "Seltiv SLMS" resolves centered, smaller than the hook. Final line beneath it: "Built for every school." Long quiet hold, no CTA.
Sequential/interaction: none
Audio intent: music fades out gently under the last ~2s, ending on quiet
Audio-coupled idea: none
Transition mood: — (end)

**Music mood for this video:** upbeat but restrained — confident business/product-film energy, never chaotic
**Audio summary:** A warm instrumental bed carries the whole video at steady volume, accented only by a handful of soft, motion-matched ticks on sequential reveals (roll call, bKash match, branch cards), swelling slightly into the final two scenes and fading out under the quiet outro.
