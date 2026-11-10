import { AiServiceError } from './ai-server';
import { relevantSchemes, type AdvisorInput } from './ai-guidance';
import { schemeKnowledgeFacts } from './scheme-knowledge';
import { screenLoanProfile } from './loan-screening';

function normalize(text: string) {
  return text.normalize('NFKC').replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x966))
    .replace(/(\d)[ \u00a0\u202f](?=\d{3}(?:\D|$))/g, '$1');
}

function claims(text: string) {
  const amounts: number[] = [];
  const percentages: number[] = [];
  const number = String.raw`(\d[\d,]*(?:\.\d+)?)`;
  const unit = String.raw`(?:\s*(lakh(?:s)?|lac(?:s)?|crore(?:s)?|million|thousand|लाख|करोड़|हजार|हज़ार|cr\b|l\b|k\b))?`;
  const multiplier = (unit?: string) => /^(?:lakh|lac|लाख|l$)/i.test(unit ?? '') ? 100_000
    : /^(?:crore|करोड़|cr$)/i.test(unit ?? '') ? 10_000_000 : /million/i.test(unit ?? '') ? 1_000_000
      : /^(?:thousand|हजार|हज़ार|k$)/i.test(unit ?? '') ? 1000 : 1;
  const value = (raw: string, unit?: string) => Number(raw.replaceAll(',', '')) * multiplier(unit);
  const clean = normalize(text);
  const range = String.raw`(?:\s*(?:to|[-–—]|से)\s*` + number + unit + ')?';
  const money = number + unit + range;
  const addMoney = (match: RegExpMatchArray) => {
    amounts.push(value(match[1], match[2] ?? match[4]));
    if (match[3]) amounts.push(value(match[3], match[4] ?? match[2]));
  };
  for (const match of clean.matchAll(new RegExp(String.raw`(?:₹|\bINR\b|\bRs\.?|\brupees?)\s*` + money, 'gi'))) {
    addMoney(match);
  }
  for (const match of clean.matchAll(new RegExp(money + String.raw`\s*(?:rupees?\b|रुपये|रुपए)`, 'gi'))) {
    addMoney(match);
  }
  for (const match of clean.matchAll(new RegExp(number + String.raw`(?:\s*(?:to|[-–—]|से)\s*` + number + String.raw`)?\s*(?:%|percent\b|per cent\b|प्रतिशत)`, 'gi'))) {
    percentages.push(value(match[1]));
    if (match[2]) percentages.push(value(match[2]));
  }
  return { amounts, percentages };
}

function monetaryNumbers(value: unknown, key = ''): number[] {
  if (typeof value === 'number') return /amount|cost|income|loan|funding|contribution|principal|interest|payment|emi/i.test(key)
    && !/rate|percentage|years|months/i.test(key) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(item => monetaryNumbers(item, key));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([field, item]) => monetaryNumbers(item, field));
  return [];
}

// Conservative deterministic checks, not a proof of factual correctness. They run
// inside each provider attempt, before success, playback or caching is possible.
export function advisorValidation(input: AdvisorInput) {
  const schemes = relevantSchemes(input);
  const facts = schemes.map(scheme => schemeKnowledgeFacts(scheme, input.tool));
  const screen = screenLoanProfile(input.profile);
  const selectedNames = new Set(schemes.map(scheme => scheme.name));
  const trusted = { facts, profileFacts: screen.profileFacts, options: screen.options.filter(option => selectedNames.has(option.schemeName)),
    repayment: input.repayment };
  const published = claims(JSON.stringify(trusted));
  const raw = monetaryNumbers(trusted);
  const allowedAmounts = [...raw, ...published.amounts];
  const allowedRates = [...published.percentages, ...schemes.flatMap(scheme =>
    [scheme.concessionalInterestRate, scheme.maxLoanPercentage].filter((value): value is number => typeof value === 'number')),
    ...(input.repayment ? [input.repayment.annualRate] : [])];
  const urls = new Set(schemes.map(scheme => scheme.sourceUrl.replace(/\/$/, '')));
  const matches = (value: number, allowed: number[], tolerance: number) => allowed.some(number => Math.abs(value - number) <= tolerance);
  return {
    key: 'advisor-guard-v3:' + input.language + ':' + JSON.stringify(trusted),
    check(text: string) {
      if (input.language === 'hi' && !/[अ-ह]/u.test(text)) throw new AiServiceError('ungrounded_response');
      const found = claims(text);
      // Permit rupee rounding for calculator output; percentage claims stay exact.
      if (found.amounts.some(value => !matches(value, allowedAmounts, input.repayment ? 1 : 0.01))
        || found.percentages.some(value => !matches(value, allowedRates, 0.00001))) {
        throw new AiServiceError('ungrounded_response');
      }
      for (const match of text.matchAll(/https?:\/\/[^\s<>"\])]+/gi)) {
        const url = match[0].replace(/[.,;!?]+$/, '').replace(/\/$/, '');
        if (!urls.has(url)) throw new AiServiceError('ungrounded_response');
      }
      // Never expose raw model reasoning markup as a finished answer.
      if (/<\/?think\b|<\|(?:analysis|start|channel)/i.test(text)) throw new AiServiceError('ungrounded_response');
    },
  };
}
