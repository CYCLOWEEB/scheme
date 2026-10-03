# Project analysis and changes

**Reviewed:** 2 October 2026  
**Project:** Scheme Lens (Next.js / React)

## What the project does

The app screens a profile against selected concessional-credit and adjacent business-support programmes, estimates loan repayments where terms are published, shows channel-agency information, provides an AI and voice assistant, and offers document preparation. It is an independent planning tool; it does not submit applications or determine eligibility.

## Findings and fixes

- **Corrected scheme facts and matching.** The catalog covers NSFDC and NSKFDC credit alongside selected central programmes for enterprise credit, guarantees, subsidies, and business support. Entries link to their sources, and matching distinguishes target groups, purpose, income limits, project-cost limits, admission, and other scheme-specific conditions. The ELS ₹40 lakh figure is a loan cap, while support is also limited to 90% of course fees.
- **Removed false certainty.** Cards describe preliminary profile fit and show caveats; they do not call a person fully eligible. The calculator no longer assumes a grant or a generic market rate, and application/document flows no longer claim to route, approve, upload, or verify anything.
- **Replaced synthetic partner data.** Removed invented branch contacts, ratings, funding status, NPA figures, and processing times. Added a state and text-searchable directory of 38 agency records transcribed from NSFDC’s 1 April 2026 SCA listing. The UI links to the source and PM SURAJ where appropriate, and explains that the listing is static and not a branch-level or live-status locator.
- **Improved estimates and preparation.** The calculator applies scheme percentage and rupee caps, keeps own contribution and other confirmed funding within project cost, flags project amounts outside published ranges, and clearly describes its monthly EMI and moratorium assumptions. The checklist is scheme-specific, can be switched directly, only records in-memory self-reported document availability, and prints a preparation sheet rather than a fake government form.
- **Reduced unnecessary profile collection.** Removed age, gender, and education-qualification inputs because the matching rules did not use them. Reset now clears the entered profile and document flags instead of pre-checking certificates.
- **Made voice support deployable on Vercel.** Browser speech recognition provides a live, editable preview; after Send, Gemini 3.5 Transcribe finalizes the transcript and detects the spoken language automatically. The detected English or Hindi controls the streamed Gemini advisor response and Gemini 3.8 Flash-Lite TTS playback. The Gemini API key remains server-side. See `VOICE_SETUP.md` for browser support and data handling.
- **Hardened assistant endpoints.** Added request-shape, length, and language checks; constrained scheme names to the known catalog; supplied the assistant with the reviewed scheme facts and official links; and removed the inaccurate claim that it was checking live government guidelines. Voice replies follow the detected spoken language; typed replies follow the selected app language unless the text is clearly Hindi.
- **Updated app credentials and framing.** Replaced credential-shaped values in `.env.example` with placeholders and made the independent-service status clearer in app metadata and the UI.

## Research sources

The scheme catalog was checked against the [NSFDC scheme pages](https://nsfdc.nic.in/scheme) and [NSFDC FAQ and eligibility information](https://nsfdc.nic.in/faqs), including the ₹5 lakh annual family-income ceiling effective 7 January 2026. The state-agency records use the [NSFDC directory dated 1 April 2026](https://nsfdc.nic.in/storage/channel-partners/attachments/20260401_164458_Ip6UJm.pdf). SWRS terms use the [NSKFDC scheme page](https://nskfdc.nic.in/hi/content/home/sanitation-workers-rehabilitation-scheme-swrs). The advisor uses the [Gemini 3.8 Flash API docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [Gemini streaming generation guide](https://ai.google.dev/gemini-api/docs/generate-content/text-generation), and [Gemini speech generation guide](https://ai.google.dev/gemini-api/docs/speech-generation). Final voice transcription and automatic language detection use [Gemini 3.5 Transcribe](https://ai.google.dev/gemini-api/docs/transcribe); browser interim transcripts use the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/interimResults), which has [limited browser availability and may use a server-based recognition provider](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). The voice routes set a 60-second function ceiling following [Vercel's Next.js function-duration guidance](https://vercel.com/docs/functions/configuring-functions/duration).

Scheme availability, rates, agency participation, documents, and final eligibility can change or depend on the channel agency; applicants should reconfirm them with the official authority.

Applicant-facing copy follows the [Guidelines for Indian Government Websites on clear content](https://guidelines.india.gov.in/activity/crafting-clear-and-concise-content-writing-strategies-for-government-websites/). Typography follows [GIGW readability guidance](https://guidelines.india.gov.in/activity/the-impact-of-typography-on-web-design-a-comprehensive-guide-to-aesthetics-and-readability/) and uses 1.5 line spacing, as described by [W3C WAI](https://www.w3.org/WAI/WCAG21/Techniques/css/C21).

## SIH26092 update — 3 October 2026

- Added a shortlist comparison for up to three matched schemes with CSV export. It shows the support type, published project range, funding amount, beneficiary rate, repayment and moratorium terms, indicative EMI where available, income conditions, match reasons and caveats, and documents to prepare. Each scheme links to its official source and displays its review date.
- Added a Lens landing page with four sample scenarios, each evaluated by the actual rule engine. It opens directly on the sample picker and match preview without catalogue count cards or the timed tour.
- Simplified applicant-facing words, shortened help text, softened key panels, and added a small amount of Hinglish. Applied the existing Plus Jakarta Sans font site-wide with clearer line spacing. Kept the existing header, logo, panel layout, and scheme eligibility labels.
- The comparison keeps credit guarantees and subsidies distinct from direct loans and retains the existing preliminary-fit caveat.
- SIH challenge context and scheme research are documented in [SIH26092_RESEARCH.md](SIH26092_RESEARCH.md).

## Verification and limitations

- `bun run lint`, `bunx tsc --noEmit`, and `bun run build` completed successfully.
- The voice flow was not exercised with a live English/Hindi microphone sample, a deployed Vercel preview, or a configured Gemini API key in this session.
- No automated test suite was run.
- The agency list is a static transcription of the dated NSFDC SCA PDF. It does not represent every bank or channel partner, current branch operations, funding availability, or application status.
- If the replaced values in `.env.example` were ever valid API credentials, rotate them with their providers.
