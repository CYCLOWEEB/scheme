# Voice setup

See the [AI pipeline guide](AI_PIPELINE.md) for provider routing, limits, and recovery behavior.

## Configure

If `.env.local` is not present, create it from `.env.example`. Add the server-side provider keys you want to use, then restart the app. Missing providers are skipped. Keep secret keys out of browser variables and source control.

## Use voice

Select **Speak**, allow microphone access, say your question, then stop recording. Review the transcript and edit it if needed before sending. The recorder stops at 28 seconds. If cloud transcription is unavailable, use the editable browser transcript or type your question. The written answer remains available if speech playback cannot start.

Voice recognition, installed browser voices, autoplay, and network access vary by browser. Rehearse microphone access, transcript editing, and playback in the browser profile you plan to use.

## Check configuration

Run `bun run ai:check` to inspect local configuration without provider requests. The optional `bun run ai:check --live --voice` makes live requests and uses provider quota or credits. The `/api/ai/status` endpoint reports local process counters without making provider requests.
