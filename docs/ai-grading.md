# Seltiv AI: marking changes

The admin portal now has **Seltiv AI** at `/admin/ai` and **Exams & Grades → Marking Structure** at `/admin/exams/marking-structure`.

## Workflow

1. An administrator describes a class/subject marking change in English, Bengali or Banglish.
2. The server sends the request and class/subject catalog to the local Ollama model. It does not send student records.
3. The application validates the model response, resolves the actual class and subject, checks component totals and shows current/proposed allocations.
4. The administrator can edit the request or approve the proposal. A server-signed, actor-bound proposal expires after 30 minutes. Approval checks the academic year and the structure's revision again.
5. Every period is saved together with approval history in one atomic MongoDB document update. Repeated approval requests do not apply the same proposal twice.
6. Marking Structure shows the saved settings and approval history, including after a reload.

This first version handles marking components for **Pretest**, **Test**, and **Final term**. Supported components are diary, attendance, weekly test, exam, final exam and final test. Incomplete or invalid model output produces an error rather than a mutation. Requests that already match the saved allocations do not create another revision.

## Using the structure in grading

When creating an exam, choose its **Assessment type**. Its subject mark sheets use the approved allocations for the exam's academic year. The type is explicit: existing terms such as First Term, Half-Yearly and Annual are not silently remapped to Pretest, Test or Final term.

Teacher mark entry displays one field per component and calculates the total. Each component is checked on the server. A partial draft retains its entered components but has no total; submission requires all components or an absent status. Result processing consumes the saved total.

The exam subject freezes its full marks and component structure on the first marks save, across sections. Later policy updates apply to new/unstarted mark sheets. Saved and published grades are not recalculated by the AI approval action. Historical single-total exams continue to work.

## Local setup

The application defaults to:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:7b
```

Run Ollama and the SLMS server on the same host, or configure a private Ollama endpoint accessible to the server. No model API key is required. The model must already be installed. The adapter uses Ollama's [structured JSON output API](https://docs.ollama.com/capabilities/structured-outputs), followed by independent application validation.

On the development machine used for this recording, the existing models are at `/mnt/Drive/ai/ollama/models`. The global Ollama path still points to an unavailable `/run/media/...` path. Start the service with the mounted path explicitly:

```bash
OLLAMA_MODELS=/mnt/Drive/ai/ollama/models OLLAMA_NO_CLOUD=1 ollama serve
```

The local MongoDB binary on this machine is started with:

```bash
MONGO_BIN=/home/sudipta/.local/opt/mongodb/bin/mongod bash scripts/dev-mongo.sh
npm run dev -- --port 3000
```

Use a strong `AUTH_SECRET` in production; it protects sessions and proposal signatures.

## Validation

- 43 unit tests pass, including proposal totals, component validation, signature tampering, role denial, expiry, stale revisions, retry behavior, concurrent approval failure and allocation freezing.
- Browser recording used the actual local Qwen model and normal admin form actions. The database was checked after approval and the saved page was reloaded.
- `scripts/check-ai-marks.mjs` creates a temporary exam through the app, enters components totaling 92, saves/reloads, processes a draft result, checks partial draft behavior and rejects incomplete submission. It removes only that test-created exam and its child data afterward.
- Targeted TypeScript and ESLint checks cover the implementation. The full repository TypeScript check still reports existing errors in seed data, notifications, accounts, service requests, academic imports and notice audience types. The model helper's schema type was tightened to prevent TypeScript exhausting its heap before reporting diagnostics.

## Recording

The new recording is `video/ai-live/seltiv-ai-live.mp4`. It captures the actual application, not the earlier concept UI. It is about 47 seconds, 1920×1080 at 30 fps, silent with captions. Idle model processing time is shortened and labeled. The final brand slate is added in editing.

- `scripts/record-ai-workflow.mjs`: captures the actual prompt → model → review → approve → reload workflow against the local seeded database. This applies the requested structure, so subsequent identical requests correctly report that no change is needed. To record another update, use a request that differs from the current structure.
- `scripts/render-ai-workflow.mjs`: renders the saved browser footage, captions and closing slate.
- Raw footage: `video/ai-live/raw/workflow.webm`.
- The old `video/ai-grading` artifact remains a separate, superseded concept video.
