# Shared scheme knowledge

`catalogue.json` is the single source of scheme facts for the finder, rule engine,
summaries, comparisons, document planner, repayment explainer and voice assistant.
`trades.json` holds the PM Vishwakarma trade list. No API key is needed to read them.

Each scheme has a stable `id`, names, support type, benefits, eligibility,
financial terms, document checklist, `sourceUrl` and `sourceReviewed` date. Edit
these records when an official source changes, then rebuild/restart the app.
Keep unpublished terms absent rather than guessing. Do not put applicant records,
recordings, secrets or generated AI answers here.

The app imports this folder through `lib/schemes-data.ts`, so the same records are
bundled into local and standalone deployments. It retrieves up to three relevant
schemes before a model call and selects fields for the requested tool. Providers
receive that context; they do not browse your computer or receive the entire folder.

Standard English/Hindi summaries, document plans and repayment explanations are
assembled from these records and validated inputs without a model call. Other
languages and interpretive questions use Gemini, then Groq, with these same facts.
The [AI pipeline guide](../../docs/AI_PIPELINE.md) describes routing, speech fallbacks, and cost controls.
