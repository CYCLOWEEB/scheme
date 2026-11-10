# Scheme knowledge and AI pipeline

## How requests work

1. Every feature reads the same `data/schemes/catalogue.json` records through
   `lib/schemes-data.ts`. The folder is bundled into the app; no upload, vector
   database, embedding bill or provider file storage is needed.
2. All five AI tools and ordinary chat questions try the configured models first.
   Completing the scheme finder automatically requests the existing AI explanation.
   If services are unavailable, prepared facts provide labelled catalogue recovery.
3. AI tools and open questions retrieve up to three relevant records. Common
   names such as MUDRA and Hindi aliases resolve to their catalogue records.
   Follow-ups retain the current subject; comparisons can refer to the previous
   scheme. The model receives only the
   relevant fields, dated sources, applicable screening conditions and a bounded
   conversation window. Checklist requests omit unrelated financial fields;
   repayment requests omit document lists. Numerical calculations and screening
   stay deterministic. A compact discovery index is only sent when no scheme is
   selected.
4. Default reasoning tries **Gemini 3.5 Flash-Lite → Groq GPT-OSS 20B**.
   The independent provider is tried before another model from the same service.
   Sarvam 105B is an optional last text fallback, off by default to preserve voice
   credits. Set `AI_TEXT_PRIMARY=groq` to prefer Groq for your account instead.
   Gemini 3.8 Flash is an optional alternate via `GEMINI_TEXT_MODELS`; it is
   excluded from the default and local configuration because live probes on this
   setup timed out even after 30 seconds.
5. If all configured services fail, the app shows labelled catalogue guidance.
   It never displays or caches a partial model response as a complete answer.

Both default text models are listed as stable/production. Qwen remains an explicit
preview option; GPT-OSS 120B is a reviewed production alternate through
`GROQ_TEXT_MODELS`. This is a deployment choice, not a measured uptime ranking.
Account quotas and network conditions can still favor either provider.
[Gemini model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite),
[Groq model](https://console.groq.com/docs/model/openai/gpt-oss-20b).

## Voice

**Recording → Sarvam Saaras v4 transcription → Gemini/Groq
reasoning → Sarvam Bulbul v3 speech in the detected language.**

- The recorder stops at 28 seconds to leave headroom under Sarvam's 30-second
  REST limit. Existing longer/unknown-duration inputs skip Sarvam and try Groq,
  then Gemini. Groq uses `whisper-large-v3-turbo` and `verbose_json` so language
  detection does not need another model call. Transcription preserves the spoken
  language; no intermediate English translation is requested.
- Sarvam/Groq detected-language metadata passes through the transcript, answer
  prompt and speech request. Marathi is no longer forced to Hindi; detected
  English also overrides a Hindi interface hint. When metadata is unavailable,
  the script and selected language provide a best-effort hint.
- If Sarvam transcription fails, try Groq, then Gemini, then the editable browser
  transcript. If there is no usable transcript, retain the recording for retry
  and allow typing. User-edited text skips another transcription call.
- Sarvam Bulbul v3 handles English, Hindi, Marathi, Bengali, Tamil, Telugu,
  Gujarati, Kannada, Malayalam, Punjabi and Odia. Unsupported languages, replies
  over its 2,500-character limit, exhausted credits or errors use Gemini speech,
  then browser speech. No reply is truncated to fit a vendor limit. The written
  answer remains visible if playback fails.
- Complete cloud/translation failure uses the local English/Hindi catalogue and
  explicitly labels that recovery. English recovery is spoken with an English
  voice rather than assigning it the failed request's language.

[Sarvam transcription](https://docs.sarvam.ai/api-reference/speech-to-text/transcribe),
[Sarvam speech](https://docs.sarvam.ai/api-reference/text-to-speech/convert),
[Groq transcription](https://console.groq.com/docs/speech-to-text).

## Cost and reliability controls

- Chat and AI tools normally use one text call; subsequent identical requests
  use the cache. A new voiced answer normally needs three calls: transcription,
  reasoning and speech. Fallback attempts can add calls. Replaying cached audio
  does not generate speech again.
- Validated complete text, transcripts and audio share a bounded 30-minute server
  memory cache. Duplicate concurrent requests share one operation. The browser
  also caches live answers/audio. Prompt facts, language, model configuration and
  relevant inputs are part of server cache keys.
- Gemini Flash-Lite uses minimal thinking; generated answers have output limits.
  Only relevant context is sent, without repeating every scheme or checklist.
- GPT-OSS uses low reasoning effort, excludes reasoning from the response and
  reserves 1,800 completion tokens, including hidden reasoning. Qwen's optional
  preview uses no reasoning and 900 completion tokens.
- Advisor acceptance checks explicit currency figures and percentages against
  selected records/screen results/calculator inputs, accepts only selected official
  URLs and rejects leaked reasoning markup. Rejected output triggers failover and
  cannot enter the cache. These checks do not prove semantic factual correctness.
- Requests have individual timeouts and overall deadlines. Authentication
  failures, missing models, rate-limit responses, credit exhaustion, timeouts and
  malformed output trigger recovery/cooldowns. `Retry-After` and Groq quota
  headers are respected. Failed attempts count against local allowances.
- Total deadlines are divided among remaining targets. Transport and body reads
  have hard application timeouts even when a transport ignores cancellation.
  Text/transcript JSON is bounded to 128 KB; speech JSON to 11 MB. Repeated model
  failures back off from 30 seconds to five minutes with jitter; a single recovery
  probe is admitted after cooldown. Browser speech requests time out at 22 seconds.
- Token reservations are reconciled with provider-reported `usage.total_tokens`
  when available, avoiding false token-limit failures on normal follow-ups.
  The browser shows a specific explanation for failures and offers catalogue
  recovery. Same-origin checks use the actual request host, including loopback
  and LAN addresses, rather than Next's normalised internal hostname.
- `AI_MAX_CALLS_PER_DAY`, Gemini guards and
  `AI_SARVAM_MAX_ESTIMATED_RUPEES` limit this server process. The Sarvam amount is
  a conservative reservation estimate, not measured billing or a verified balance.
  Limits and cache reset on restart; multiple replicas require shared storage for
  a deployment-wide budget. Provider dashboards control actual billing/quotas.
- Keys, recordings, prompts and applicant data are not written to the scheme
  folder. Only selected context/audio is sent to the relevant provider. The
  catalogue contains official sources and review dates, not live-verified rules.

## Configuration and usage checks

Add server keys to `.env.local` and restart:

```dotenv
GEMINI_API_KEY=...
GROQ_API_KEY=...
SARVAM_API_KEY=...
AI_TEXT_PRIMARY=gemini
AI_SARVAM_TEXT_FALLBACK=false
```

`bun run ai:check` and `GET /api/ai/status` inspect configuration with zero API
calls. Status includes provider attempts/successes/failures, conservative token
reservations, cache hits, fallback successes and process-local allowance usage.
These counters describe this app process, not usage from other apps or a
provider's invoice. Keys and question content are never returned.

After adding keys, `bun run ai:check --live --advisor --failover --voice` makes small paid/quota-using
connectivity checks and English/Hindi audio round trips. Unit/integration tests
mock the providers and do not spend credits. A successful check confirms those
requests worked; external services and browser voices cannot guarantee uptime.

New clients use `/api/ai/advisor`, `/api/ai/transcribe` and `/api/ai/tts`. The old
`/api/gemini/*` paths remain compatible and run the same multi-provider pipeline.
