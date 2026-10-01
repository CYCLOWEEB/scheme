# Project analysis and changes

**Reviewed:** 29 September 2026  
**Project:** Scheme Lens (Next.js / React)

## What the project does

The app screens a profile against a small set of concessional-credit schemes, estimates loan repayments, shows channel-agency information, provides an AI and voice assistant, and offers a document preparation checklist. It is an independent planning tool; it does not submit applications or determine eligibility.

## Findings and fixes

- **Corrected scheme facts and matching.** Replaced stale or unsupported entries with six source-linked products: NSFDC MFS, AMY, Udyam Nidhi, Term Loan, and Educational Loan; plus NSKFDC SWRS. The rules now distinguish target groups, purpose, income limits, project-cost limits, admission, and sanitation-worker conditions. Removed an inferred ELS project-cost ceiling: the published ₹40 lakh figure caps the loan, while the loan is also limited to 90% of fees.
- **Removed false certainty.** Cards describe preliminary profile fit and show caveats; they do not call a person fully eligible. The calculator no longer assumes a grant or a generic market rate, and application/document flows no longer claim to route, approve, upload, or verify anything.
- **Replaced synthetic partner data.** Removed invented branch contacts, ratings, funding status, NPA figures, and processing times. Added a state and text-searchable directory of 38 agency records transcribed from NSFDC’s 1 April 2026 SCA listing. The UI links to the source and PM SURAJ where appropriate, and explains that the listing is static and not a branch-level or live-status locator.
- **Improved estimates and preparation.** The calculator applies scheme percentage and rupee caps, keeps own contribution and other confirmed funding within project cost, flags project amounts outside published ranges, and clearly describes its monthly EMI and moratorium assumptions. The checklist is scheme-specific, can be switched directly, only records in-memory self-reported document availability, and prints a preparation sheet rather than a fake government form.
- **Reduced unnecessary profile collection.** Removed age, gender, and education-qualification inputs because the matching rules did not use them. Reset now clears the entered profile and document flags instead of pre-checking certificates.
- **Hardened assistant endpoints.** Added request-shape, length, language, and configuration checks; constrained scheme names to the known catalog; supplied the assistant with the reviewed scheme facts and official links; and removed the inaccurate claim that it was checking live government guidelines. Updated the Sarvam request to the documented Bulbul v3 format and kept browser speech as a fallback.
- **Updated app credentials and framing.** Replaced credential-shaped values in `.env.example` with placeholders and made the independent-service status clearer in app metadata and the UI.

## Research sources

The scheme catalog was checked against the [NSFDC scheme pages](https://nsfdc.nic.in/scheme) and [NSFDC FAQ and eligibility information](https://nsfdc.nic.in/faqs), including the ₹5 lakh annual family-income ceiling effective 7 January 2026. The state-agency records use the [NSFDC directory dated 1 April 2026](https://nsfdc.nic.in/storage/channel-partners/attachments/20260401_164458_Ip6UJm.pdf). SWRS terms use the [NSKFDC scheme page](https://nskfdc.nic.in/hi/content/home/sanitation-workers-rehabilitation-scheme-swrs). The AI and voice integrations were checked against the [Gemini 3.8 Flash API docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) and [Sarvam text-to-speech docs](https://docs.sarvam.ai/api-reference/text-to-speech/convert).

The catalog intentionally remains limited to these six products. Scheme availability, rates, agency participation, documents, and final eligibility can change or depend on the channel agency; applicants should reconfirm them with the official authority.

## Verification and limitations

- `npm run lint` and `npm run build` could not start: this checkout has no `node_modules`, and the machine’s npm launcher points to a missing global `npm-cli.js` file.
- No automated test suite was run.
- The agency list is a static transcription of the dated NSFDC SCA PDF. It does not represent every bank or channel partner, current branch operations, funding availability, or application status.
- If the replaced values in `.env.example` were ever valid API credentials, rotate them with their providers.
