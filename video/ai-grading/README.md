# Seltiv AI grading video

44 seconds · 1920×1080 · 30 fps · landscape · captions only, silent.

## Deliverable

`seltiv-ai-grading.mp4`

This is a staged concept demonstration, styled using the existing Seltiv SLMS design tokens. The current application checkout does not contain an AI chat or AI approval workflow. The video simulates the requested interaction and does not modify school records or implement that feature.

## Timeline

- 00:00–00:03: “A new marking structure. One simple request.”
- 00:03–00:15: Administrator types the user's exact Banglish prompt, then clicks Send request.
- 00:15–00:19: AI prepares the marking changes and checks totals.
- 00:19–00:30: Review Pretest, Test and Final term; cursor clicks Approve changes.
- 00:30–00:32: Applying changes.
- 00:32–00:37: Updated marking table with Applied status.
- 00:37–00:44: “Changes are made effortlessly with AI. With Seltiv SLMS.”

## Allocations

| Assessment | Components | Total |
| --- | --- | --- |
| Pretest | Diary 5, Attendance 10, Weekly test 25, Final exam 60 | 100 |
| Test | Exam 100 | 100 |
| Final term | Weekly test 25, Final test 75 | 100 |

## Edit and render

Edit `index.html`. It has a deterministic `renderFrame(seconds)` function and loops automatically when opened normally. From the repository root, run `node video/ai-grading/render.mjs` to export the MP4 using the installed Playwright and FFmpeg. `--preview` exports representative stills only.
