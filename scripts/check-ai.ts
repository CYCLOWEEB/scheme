import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AiServiceError, createAiGateway } from '../lib/ai-server';
import { advisorPrompt, normalizeAdvisorInput } from '../lib/ai-guidance';
import { advisorValidation } from '../lib/ai-validation';

// Bun loads .env.local. Default mode deliberately performs zero network requests.
const args = new Set(process.argv.slice(2));
const live = args.has('--live');
const voice = args.has('--voice');
const advisor = args.has('--advisor');
const failover = args.has('--failover');
const gateway = createAiGateway();
const config = gateway.status();
console.log('AI configuration (keys are never printed):');
console.log(JSON.stringify(config, null, 2));
console.log('Actual Gemini quotas: https://aistudio.google.com/usage?tab=rate-limit');
console.log('Sarvam credits and quotas: https://dashboard.sarvam.ai/');
console.log('Actual Groq quotas: https://console.groq.com/settings/limits');
console.log('Verify Gemini Free tier, Sarvam signup credits with auto-recharge off, and Groq Free if used. Keys cannot prove billing status.');
if (config.geminiConfigured && config.textModels.length === 0) {
  console.log('GEMINI_TEXT_MODELS has no supported model IDs. Restore the values from .env.example.');
  process.exitCode = 1;
}
if (config.groqConfigured && config.groqTextModels.length === 0) {
  console.log('GROQ_TEXT_MODELS has no supported model IDs. Restore the values from .env.example.');
  process.exitCode = 1;
}

if (!live) {
  console.log('No API calls made. Use --live for tiny model probes; --live --voice also checks English/Hindi audio.');
  if (!config.geminiConfigured && !config.sarvamConfigured && !config.groqConfigured) process.exitCode = 1;
} else if (!config.enabled || (!config.geminiConfigured && !config.sarvamConfigured && !config.groqConfigured)) {
  console.log('Add a key to .env.local and enable AI_ENABLED before running live checks.');
  process.exitCode = 1;
} else {
  const reports: { check: string; ok: boolean; detail: string }[] = [];
  const isolate = (provider: 'gemini' | 'sarvam' | 'groq', model?: string) => createAiGateway({
    env: () => ({ ...process.env,
      GEMINI_API_KEY: provider === 'gemini' ? process.env.GEMINI_API_KEY : '',
      SARVAM_API_KEY: provider === 'sarvam' ? process.env.SARVAM_API_KEY : '',
      GROQ_API_KEY: provider === 'groq' ? process.env.GROQ_API_KEY : '',
      ...(model ? provider === 'groq' ? { GROQ_TEXT_MODELS: model } : { GEMINI_TEXT_MODELS: model } : {}),
    }),
  });
  const probe = async (label: string, work: () => Promise<string>) => {
    try {
      const detail = await work();
      reports.push({ check: label, ok: true, detail });
      console.log('PASS: ' + label + ' — ' + detail);
    } catch (error) {
      const detail = error instanceof AiServiceError ? error.reason : 'invalid_response';
      reports.push({ check: label, ok: false, detail });
      console.log('FAIL: ' + label + ' — ' + detail);
    }
  };
  if (config.geminiConfigured) {
    for (const model of config.textModels) {
      await probe(model, async () => {
        // Isolate each model so a successful fallback cannot conceal its failure.
        const isolated = isolate('gemini', model);
        const result = await isolated.text('You are checking API connectivity. Reply briefly in plain text.',
          'Reply with exactly READY.');
        if (!/\bREADY\b/.test(result.value)) throw new Error('Unexpected reply');
        return 'Completed one tiny request.';
      });
    }
  }
  if (config.sarvamConfigured && config.sarvamTextFallbackEnabled) {
    await probe('Sarvam optional third text fallback', async () => {
      const result = await isolate('sarvam').text('You are checking connectivity. Reply briefly.', 'Reply with exactly READY.');
      if (!/\bREADY\b/.test(result.value)) throw new Error('Unexpected reply');
      return result.model + ' completed one tiny request.';
    });
  }
  if (config.groqConfigured) {
    for (const model of config.groqTextModels) await probe('Groq independent text fallback: ' + model, async () => {
      const isolated = isolate('groq', model);
      const result = await isolated.text('You are checking connectivity. Reply briefly.', 'Reply with exactly READY.');
      if (!/\bREADY\b/.test(result.value)) throw new Error('Unexpected reply');
      return result.model + ' completed one tiny request.';
    });
  }
  if (advisor) {
    for (const provider of ['gemini', 'groq', 'sarvam'] as const) {
      if (!(provider === 'gemini' ? config.geminiConfigured : provider === 'groq' ? config.groqConfigured
        : config.sarvamConfigured && config.sarvamTextFallbackEnabled)) continue;
      await probe(provider + ' grounded advisor with financial validation', async () => {
        const input = normalizeAdvisorInput({ tool: 'summary', schemeIds: ['nsfdc-mfs'], language: 'en' });
        const { system, prompt } = advisorPrompt(input);
        const result = await isolate(provider).text(system, prompt, advisorValidation(input));
        if (result.value.length < 80) throw new Error('Unexpectedly short advisor answer');
        return result.model + ' returned a complete answer accepted by the financial/source guard.';
      });
    }
  }
  if (failover) {
    if (!config.geminiConfigured || !config.groqConfigured) {
      await probe('Independent failover prerequisites', async () => { throw new Error('Both text providers are required'); });
    } else for (const primary of ['gemini', 'groq'] as const) {
      await probe(primary + ' simulated outage → real independent backup', async () => {
        let blocked = 0;
        const recovery = createAiGateway({ env: () => ({ ...process.env, AI_TEXT_PRIMARY: primary, AI_SARVAM_TEXT_FALLBACK: 'false' }),
          fetch: (async (url, init) => {
            const primaryUrl = primary === 'gemini' ? 'googleapis.com' : 'groq.com';
            if (String(url).includes(primaryUrl)) { blocked++; return Response.json({}, { status: 503 }); }
            return fetch(url, init);
          }) as typeof fetch });
        const result = await recovery.text('Check connectivity. Reply briefly in plain text.', 'Reply with exactly READY.');
        if (!blocked || !/\bREADY\b/.test(result.value) || result.model.startsWith(primary + '/')) throw new Error('Failover did not complete');
        return result.model + ' answered after the primary outage; no live call was sent to the simulated failed primary.';
      });
    }
    if (config.sarvamConfigured && config.sarvamTextFallbackEnabled) {
      await probe('Both preferred text services fail → real Sarvam backup', async () => {
        const recovery = createAiGateway({ env: () => ({ ...process.env, AI_SARVAM_TEXT_FALLBACK: 'true' }),
          fetch: (async (url, init) => String(url).includes('sarvam.ai') ? fetch(url, init)
            : Response.json({}, { status: 503 })) as typeof fetch });
        const result = await recovery.text('Check connectivity. Reply briefly in plain text.', 'Reply with exactly READY.');
        if (!result.model.startsWith('sarvam/') || !/\bREADY\b/.test(result.value)) throw new Error('Third-provider recovery did not complete');
        return result.model + ' answered after simulated preferred-service outages.';
      });
    }
  }
  if (voice) {
    const voiceProviders: ('gemini' | 'sarvam')[] = [];
    if (config.geminiConfigured) voiceProviders.push('gemini');
    if (config.sarvamConfigured) voiceProviders.push('sarvam');
    if (!voiceProviders.length) console.log('No cloud speech provider configured; rehearse browser speech separately.');
    for (const provider of voiceProviders) {
      const voiceGateway = isolate(provider);
      for (const [language, sample, keyword] of [
        ['en', 'Hello. Please explain the scheme.', /scheme|explain/i],
        ['hi', 'नमस्ते। मुझे योजना के बारे में बताइए।', /योजना|yojana/i],
      ] as const) {
        await probe(provider + ' ' + language + ' speech and transcription round trip', async () => {
          const audio = await voiceGateway.speech(sample, language);
          const transcript = await voiceGateway.transcribe(audio.value.data, audio.value.mimeType);
          if (!keyword.test(transcript.value)) throw new Error('Unexpected transcript');
          const directory = join(process.cwd(), '.codex-tmp', 'ai-check');
          await mkdir(directory, { recursive: true });
          await writeFile(join(directory, 'voice-' + provider + '-' + language + '.wav'), Buffer.from(audio.value.data, 'base64'));
          return 'Transcript: ' + transcript.value + ' — saved audio in .codex-tmp/ai-check.';
        });
      }
    }
  }
  console.log('A successful probe proves one request worked; it does not establish your daily quota or a service guarantee.');
  console.log('Rehearse the microphone, playback and toolkit in your presentation browser.');
  const directory = join(process.cwd(), '.codex-tmp', 'ai-check');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'report.json'), JSON.stringify({ checkedAt: new Date().toISOString(), reports }, null, 2));
  if (reports.some(report => !report.ok)) process.exitCode = 1;
}
