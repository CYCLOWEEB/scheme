# Scheme Lens

Scheme Lens helps people explore Indian government support schemes. It combines a dated scheme catalogue, eligibility screening, repayment calculations, agency contacts, document planning, optional AI and voice guidance, and a private document locker.

## Run locally

Install Node.js and Bun 1.4.3, then run:

```powershell
bun install --frozen-lockfile
bun run dev
```

Open [localhost:3000](http://localhost:3000). Scheme discovery, comparison, calculations, agency lookup, and the checklist work without service credentials.

## Optional services

Add the relevant server keys from `.env.example` to `.env.local` and restart the app. Gemini, Groq, and Sarvam enable live AI and voice features. Supabase enables private document uploads; see [Supabase setup](docs/SUPABASE_SETUP.md). Keep provider secrets on the server.

See the [AI pipeline](docs/AI_PIPELINE.md) for provider routing and limits, [voice setup](docs/VOICE_SETUP.md) for microphone use, and [agency contact sources](docs/AGENCY_CONTACT_SOURCES.md) for contact records. Scheme facts and maintenance rules are documented in [data/schemes](data/schemes/README.md).

## Useful commands

```powershell
bun run lint
bun run typecheck
bun test
bun run build
bun run start
bun run ai:check
bun run clean
```

Run `bun run start` after a successful build. `bun run ai:check` inspects configuration without making provider requests. `bun run clean` removes generated build and coverage files.

## Project structure

| Location | Contents |
| --- | --- |
| `app/` | Main page, styles, and API routes |
| `components/` | Application screens and interface components |
| `data/schemes/` | Scheme catalogue and trade list |
| `lib/` | Scheme data, matching rules, profiles, and AI services |
| `images/`, `public/` | Demo images, app icon, local fonts, and licenses |
| `supabase/migrations/` | Document storage schema and access policies |
| `scripts/` | Project maintenance and AI configuration checks |
| `docs/` | Setup guides and source notes |

Scheme and agency data include dated official sources. The app provides preliminary planning information; official authorities determine current rules and application outcomes.
