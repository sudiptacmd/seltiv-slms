# Hyperframes Composition Brief: Seltiv SLMS

## Objective
Create a longer, "detailed" launch-style brag video for Seltiv SLMS that tours all four portals, not just a 2-3 highlight reel.

## Output
- Composition directory: `composition/`
- Rendered video: `../brag.mp4`
- Format: landscape — 1920x1080
- Duration: 45 seconds (explicit user override of the normal 15-25s brag law — see brag-plan.md)

## Source Material
- Project root: /home/goswami/Documents/GitHub/seltiv-slms
- Primary files read: README.md, marketing/index.html, marketing/shared.css, screenshots/*.png
- Product name: Seltiv SLMS
- Tagline / strongest claim: "Your whole school. On one screen." (verbatim from the product's own marketing page)
- Key UI moments to recreate: the four portal screenshots, framed in the same browser-chrome card style already used in the earlier brag cut and on the marketing site.
- Copy that must appear verbatim:
  - "Your whole school. On one screen."
  - "Built for every school."
  - "Reproducible for any school running more than one branch."

## Creative Direction
- Tone preset: polished
- Creative direction: quiet premium product film — reassuring, not hyped
- Interpretation: fewer, longer holds; soft crossfades; restrained typography-led motion. At 45s, the extra time goes to finishing each portal's story (two screens each), not to padding any single scene.
- Angle: four jobs, four screens, one system — tour each of the four portals in turn instead of a single highlight reel.
- Hook: paper-white background, wordmark resolves, then "Your whole school. On one screen."
- Outro / punchline: quiet return to the wordmark, "Built for every school." — no CTA.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Naming any specific real school/trust (product must read as generic/reproducible)
  - Unrelated visual redesign — reuse the product's own palette and framing exactly

## Visual Identity
- Background: #faf9f5
- Surface: #ffffff
- Text: #201e1d
- Muted text: #6b6866
- Accent (teal): #0088b0
- Accent 2 (magenta): #d6006c
- Yellow: #edbb00
- Display font: Georgia/Times New Roman serif fallback (product's real Source Serif 4 needs a network fetch Hyperframes' determinism rules disallow, same substitution as the previous brag run)
- Body font: ui-sans-serif, system-ui, Segoe UI, Roboto
- Visual references: browser-chrome-framed screenshot cards (as used in the prior brag cut and on marketing/index.html's `.frame` treatment); small bordered "branch cards" motif from marketing/office section for the architecture scene

## Storyboard
Use `brag-plan.md` as the creative contract. Scene summary:

1. Hook — 3.5s — wordmark + "Your whole school. On one screen."
2. Sign in — 4.0s — screenshots/00-login.png, caption "One login. Every role sees their own portal."
3. School office — 7.0s — 01-admin-dashboard.png → 04-admin-admissions.png, caption "Admissions to report cards — one pipeline, not a filing cabinet."
4. Teacher — 7.0s — 11-teacher-rollcall.png → 12-teacher-gradesheet.png, caption "Roll call takes seconds. Marks reach the report card the same day."
5. Parents — 7.0s — 20-parent-dashboard.png → 24-parent-fees.png, caption "Pay from a phone. No bank queue."
6. Accounts — 7.0s — 33-accounts-bkash-crop.png (already cropped to its top ~900px — do not use an uncropped tall screenshot) → 34-accounts-reports.png, caption "The ledger closes itself."
7. Reproducible architecture — 5.0s — recreated in HTML: three small bordered cards ("Own process · Own database" ×3) arriving one by one, then a fourth "+" card, caption "Reproducible for any school running more than one branch."
8. Outro — 4.5s — wordmark returns smaller, "Built for every school.", quiet hold, no CTA.

Total: 45.0s.

## Audio
- Audio role: warm instrumental bed, sparse professional accent SFX
- Audio arc: steady under scenes 1-2, continues under the portal tour (3-6) with one soft tick per screen-pair transition, gentle swell into scenes 7-8, fade out under the last ~2s
- Music: assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3 (60.00s bundled track, ~109.96 BPM, comfortably covers 45s)
- Music treatment: fade in 0→0.6s, hold ~0.26-0.30 volume through the tour, slight swell ~0.32 under scenes 7-8, fade to 0 in the last ~1.5s
- Music cue guidance: bundled preset's beat grid runs 0-~24.6s (~0.545s beat interval); strong cues at 20.19s/20.74s/21.83s/22.92s/24.01s fall inside scene 4 (teacher, 11.0-18.0s)... note scene boundaries below are absolute times, recompute against the actual scene start times chosen in composition. Beyond ~25s, continue the same ~0.545s beat interval or re-detect via `npx hyperframes beats`.
- Audio-reactive treatment: none — restraint suits this tone
- Audio-coupled moments:
  - Scene 3/4/5/6 screen-pair crossfade — one soft drop/click tick timed to the second screenshot's arrival
  - Scene 7 branch cards — one soft click tick per card, three total, then a slightly different tick for the "+" card
  - Scene 8 outro — one soft bong/accent tick under the wordmark's return, beat-locked to a nearby strong cue if one falls close (else natural timing)
- SFX selection guidance: reuse drop_001/002/003.ogg for the four screen-pair transitions (scenes 3-6), click_001/002/003.ogg for the three branch-card reveals in scene 7, switch_001.ogg optional for the "+" card, bong_001.ogg for the outro accent — matches the SFX categories already proven in the prior brag run
- SFX analysis guidance: prefer the lower high-frequency-risk files in interface/ for these repeated, polished moments
- Exact SFX choice/timestamps: finalized below once scene timings are locked
- Audio files: copied into `composition/assets/music/` and `composition/assets/sfx/interface/`

## Hyperframes Instructions
Load `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. This is /brag's own workflow — no generic hyperframes intent interview.

Requirements:
- Show real UI from all four portals (screenshots/*.png) — this is the video's whole premise.
- Keep all text readable (short label ~0.8s settled minimum; sentence ~0.3s/word).
- Duration is 45s by explicit user request (documented override of the normal 15-25s law).
- Include the music + sparse SFX layer as specified above.
- Reuse the browser-chrome screenshot-card visual language proven in the prior brag composition (`../../brag-output/composition/index.html` is a working reference in this repo for the exact card/chrome-bar/timeline pattern, including deterministic font fallback and `data-*` timing attributes) — GSAP timeline, single composition id, `window.__timelines[id] = tl`.
- Run `npx hyperframes check` before render.
