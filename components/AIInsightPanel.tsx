'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import { AI_TOOLS, selectAiProfile, selectedAiSchemes, type AiToolInput } from '@/lib/ai-tools';
import { requestAdvisor } from '@/lib/ai-client';
import { normalizeAdvisorInput, localToolNotice } from '@/lib/ai-guidance';
import { aiFailureMessage, answerSourceLabel, type AdvisorResult } from '@/lib/ai-types';
import { localizeScheme, tr } from '@/lib/ui-copy';

interface AIInsightPanelProps extends AiToolInput {
  language: string;
  compact?: boolean;
  autoGenerate?: boolean;
}

export default function AIInsightPanel({ language, compact = false, autoGenerate = false, ...input }: AIInsightPanelProps) {
  const request = { ...input, language, profile: input.profile ? selectAiProfile(input.profile) : undefined };
  // A fresh panel cancels any pending reveal when the scheme, profile or figures change.
  return <InsightContent key={JSON.stringify(request)} input={request} language={language} compact={compact} autoGenerate={autoGenerate} />;
}

function InsightContent({ input, language, compact, autoGenerate }: {
  input: AiToolInput;
  language: string;
  compact: boolean;
  autoGenerate: boolean;
}) {
  const t = (text: string) => tr(language, text);
  const id = useId();
  const tool = AI_TOOLS[input.tool];
  const sources = selectedAiSchemes(input.schemeIds);
  const isDisabled = input.tool !== 'recommendations' && sources.length < (input.tool === 'comparison' ? 2 : 1);
  const [generation, setGeneration] = useState(autoGenerate && !isDisabled ? 1 : 0);
  const [completedGeneration, setCompletedGeneration] = useState(0);
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const isLoading = generation > completedGeneration;
  const hasAnswer = generation > 0 && !isLoading;
  const answer = hasAnswer ? result?.text ?? '' : '';
  const serializedInput = JSON.stringify({ ...input, language });

  useEffect(() => {
    if (!generation) return;
    const controller = new AbortController();
    void requestAdvisor(normalizeAdvisorInput(JSON.parse(serializedInput)), controller.signal).then(answer => {
      if (controller.signal.aborted) return;
      setResult(answer);
      setCompletedGeneration(generation);
    }).catch(() => {
      // Changing a scheme or closing the panel deliberately cancels its request.
    });
    return () => controller.abort();
  }, [generation, serializedInput]);

  useEffect(() => () => {
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
  }, []);

  const generate = () => {
    if (isLoading || isDisabled) return;
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    setCopied(false);
    setCopyError(false);
    setGeneration(current => current + 1);
  };

  const copyResult = async () => {
    if (!hasAnswer) return;
    try {
      const references = sources.map(scheme => `${localizeScheme(scheme, language).name}: ${scheme.sourceUrl}`).join('\n');
      const sourceLabel = answerSourceLabel(result?.source ?? 'local', language);
      await navigator.clipboard.writeText([t(tool.title) + ' · ' + sourceLabel, answer, references, t('Suggestions are preliminary. Confirm current rules and final terms with the agency.')].join('\n\n'));
      setCopied(true);
      setCopyError(false);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
      resultRef.current?.focus();
    }
  };

  return (
    <section aria-labelledby={`${id}-title`} className={`ai-insight overflow-hidden border border-blue-100 bg-white ${compact ? 'rounded-2xl' : 'rounded-3xl shadow-sm'}`}>
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
          <div className="min-w-0">
            <h3 id={`${id}-title`} className={`${compact ? 'text-sm' : 'text-base'} font-bold text-blue-950`}>{t(tool.title)}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{t(tool.description)}</p>
          </div>
        </div>
        <button type="button" onClick={generate} disabled={isLoading || isDisabled} aria-controls={`${id}-result`} className="button-motion inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-800 hover:border-blue-300 hover:bg-blue-100 disabled:opacity-60 sm:self-auto">
          {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : hasAnswer ? <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
          {t(isLoading ? 'Generating your answer…' : hasAnswer ? 'Generate again' : tool.action)}
        </button>
      </div>
      <div id={`${id}-result`} aria-busy={isLoading}>
        {isLoading && <GeneratingAnimation key={generation} language={language} />}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{hasAnswer ? t('Your answer is ready.') : ''}</div>
        {hasAnswer && (
          <div className={`insight-answer space-y-4 border-t border-blue-100 bg-blue-50/25 ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700"><Sparkles className="h-3 w-3" aria-hidden="true" />{answerSourceLabel(result?.source ?? 'local', language)}</span>
              <button type="button" onClick={() => { void copyResult(); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-blue-700 hover:bg-blue-100">{copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}{t(copied ? 'Answer copied' : 'Copy answer')}</button>
            </div>
            {result?.source === 'local' && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">{aiFailureMessage(result.reason, language)} {localToolNotice(language)}</p>}
            <div ref={resultRef} tabIndex={-1} className="whitespace-pre-line break-words text-sm leading-7 text-slate-700">{answer}</div>
            {copyError && <p role="status" className="text-xs text-slate-600">{t('Copy is unavailable. Select the answer to copy it.')}</p>}
            {sources.length > 0 && <div className="flex flex-wrap gap-2 border-t border-blue-100 pt-3">{sources.map(scheme => <a key={scheme.id} href={scheme.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:border-blue-300"><span className="break-words">{localizeScheme(scheme, language).name}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></a>)}</div>}
            <p className="text-xs leading-relaxed text-slate-500">{t('Suggestions are preliminary. Confirm current rules and final terms with the agency.')}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function GeneratingAnimation({ language }: { language: string }) {
  const t = (text: string) => tr(language, text);
  return (
    <div className="insight-generating relative isolate overflow-hidden border-t border-blue-100 px-5 py-6 sm:px-6" role="status" aria-label={t('Generating your answer…')}>
      <div aria-hidden="true" className="insight-glow" />
      <div className="relative flex items-center gap-4 sm:gap-5">
        <div className="insight-orb shrink-0" aria-hidden="true">
          <span className="insight-orbit insight-orbit-outer" />
          <span className="insight-orbit insight-orbit-inner" />
          <span className="insight-orb-core"><Sparkles className="h-6 w-6 text-white" /></span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-bold text-blue-950">{t('Generating your answer…')}</p>
            <span className="insight-dots flex gap-1" aria-hidden="true"><i /><i /><i /></span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('Turning the details into clear next steps.')}</p>
          <div className="insight-progress mt-4 h-1.5 overflow-hidden rounded-full bg-blue-100" aria-hidden="true"><span /></div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-semibold text-blue-700 sm:text-[11px]" aria-hidden="true">
            {['Reviewing details', 'Connecting the dots', 'Finishing touches'].map((step, index) => <span key={step} className="insight-step" style={{ '--insight-step': index } as React.CSSProperties}>{t(step)}</span>)}
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-2.5 pl-0 sm:pl-[5.75rem]" aria-hidden="true">
        <div className="insight-shimmer h-2.5 w-[92%] rounded-full" />
        <div className="insight-shimmer h-2.5 w-[76%] rounded-full" />
        <div className="insight-shimmer h-2.5 w-[52%] rounded-full" />
      </div>
    </div>
  );
}
