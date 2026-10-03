# Browser and Gemini voice assistant

Voice input uses the browser’s Web Speech recognition API for a live, editable preview. Stop listening and press **Send**; Gemini 3.5 Transcribe then produces the final transcript. Devanagari transcripts are treated as Hindi; the selected language guides Latin-script transcripts such as Romanized Hindi. The advisor answer streams into the chat in that language. Voice questions are read aloud using Gemini 3.8 Flash-Lite TTS, with the browser’s built-in speech as a fallback. Written replies always stay visible with a **Listen** button.

## Setup

No local speech-recognition server or model download is required. Install the project’s Node dependencies, set `GEMINI_API_KEY` in `.env.local` for local development, and run the app normally:

```powershell
bun run dev
```

For Vercel, add `GEMINI_API_KEY` to the project’s Production or Preview environment variables and redeploy. The browser handles the live preview; Gemini speech recognition, text generation, and speech generation run through server-side APIs, so the browser never receives the API key. The language selector guides the live preview and Latin-script transcripts; Devanagari transcripts are detected as Hindi.

## Browser support and privacy

Web Speech recognition is not supported in every browser. When it is unavailable, the app can still record audio for Gemini transcription if the browser supports `MediaRecorder`; typed questions remain available as a fallback. Microphone permission must be allowed for the site. The browser’s live recognition service may also send audio to its own recognition provider depending on the browser and settings.

The app keeps the short recording in browser memory until you press **Send**. It then uploads the recording through the app’s server API to Gemini for transcription and requests deletion of the temporary Gemini file after processing. If deletion cannot be confirmed, the route logs that result. If you edit the live transcript, your edited words are kept while the detected or selected language controls the reply language. The transcript is sent to the Gemini advisor, and voice answers are sent to Gemini TTS before the resulting audio plays in the browser.
