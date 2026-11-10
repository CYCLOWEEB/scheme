'use client';

import React from 'react';
import AIInsightPanel from '@/components/AIInsightPanel';
import { ArrowDownToLine, ArrowLeftRight, ExternalLink, X } from 'lucide-react';
import { SchemeMatchResult } from '@/lib/types';
import { formatLocalizedINR as formatINR, localizeScheme, tr } from '@/lib/ui-copy';

interface SchemeComparisonProps {
  results: SchemeMatchResult[];
  onRemove: (schemeId: string) => void;
  onSelectForCalculator: (result: SchemeMatchResult) => void;
  onSelectForLocator: (schemeId: string) => void;
}

const supportLabels = {
  direct_loan: 'Direct concessional loan',
  credit_guarantee: 'Credit guarantee to a lender',
  credit_linked_subsidy: 'Credit-linked subsidy',
  business_support: 'Business support',
} as const;

function projectRange(result: SchemeMatchResult, language: string): string {
  const { minProjectCost, maxProjectCost } = result.scheme;
  if (minProjectCost === undefined && maxProjectCost === undefined) return 'No project-cost limit listed in this summary';
  if (minProjectCost !== undefined && maxProjectCost !== undefined) return `${formatINR(minProjectCost, language)}–${formatINR(maxProjectCost, language)}`;
  if (maxProjectCost !== undefined) return `Up to ${formatINR(maxProjectCost, language)}`;
  return `From ${formatINR(minProjectCost!, language)}`;
}

function fundingSummary(result: SchemeMatchResult, language: string): string {
  const { scheme } = result;
  if (scheme.programType === 'credit_guarantee') {
    return scheme.financialHighlights?.find(item => item.label.toLowerCase().includes('guarantee'))?.value
      ?? 'Guarantee cover; lender decides the loan';
  }
  if (result.recommendedLoanAmount !== undefined) return `Indicative amount: ${formatINR(result.recommendedLoanAmount, language)}`;
  if (scheme.maxLoanAmount !== undefined) return `Up to ${formatINR(scheme.maxLoanAmount, language)}`;
  return scheme.financialHighlights?.[0]?.value ?? 'See scheme terms';
}

function rateSummary(result: SchemeMatchResult): string {
  const { scheme } = result;
  if (scheme.interestRateLabel) return `${scheme.interestRateLabel}${scheme.concessionalInterestRate === undefined ? '' : ' per year'}${scheme.interestRateNote ? ` — ${scheme.interestRateNote}` : ''}`;
  if (scheme.concessionalInterestRate !== undefined) return `${scheme.concessionalInterestRate}% per year`;
  if (scheme.programType === 'credit_guarantee') return 'Participating lender sets the rate';
  return 'Not published in this summary';
}

function repaymentSummary(result: SchemeMatchResult): string {
  const { scheme } = result;
  if (scheme.repaymentTerms) return scheme.repaymentTerms;
  if (scheme.repaymentTenureYears !== undefined) return `Up to ${scheme.repaymentTenureYears} years`;
  return 'Set by the participating lender / agency';
}

function moratoriumSummary(result: SchemeMatchResult): string {
  const { scheme } = result;
  if (scheme.moratoriumTerms) return scheme.moratoriumTerms;
  if (scheme.moratoriumPeriodMonths !== undefined) return `${scheme.moratoriumPeriodMonths} months`;
  return 'Not listed in this summary';
}

function incomeSummary(result: SchemeMatchResult, language: string): string {
  const ceiling = result.scheme.maxIncomeCeiling;
  return ceiling === undefined ? 'No limit listed here; check scheme rules' : `Family income up to ${formatINR(ceiling, language)} per year`;
}

function ComparisonRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="row" className="grid min-w-[800px] grid-cols-[160px_repeat(3,minmax(210px,1fr))] border-b border-slate-100 last:border-b-0">
      <div role="rowheader" className="sticky left-0 z-10 border-r border-sky-100 bg-sky-50 px-4 py-4 text-xs font-semibold leading-relaxed text-sky-900">{label}</div>
      {children}
    </div>
  );
}

export default function SchemeComparison({ results: sourceResults, onRemove, onSelectForCalculator, onSelectForLocator, language }: SchemeComparisonProps & { language: string }) {
  const t = (text: string) => tr(language, text);
  const results = sourceResults.map(result => ({
    ...result,
    scheme: localizeScheme(result.scheme, language),
    matchReasons: result.matchReasons.map(text => t(text)),
    caveats: result.caveats.map(text => t(text)),
  }));
  const downloadComparison = () => {
    const rows = [
      [t('Field'), ...results.map(result => result.scheme.name)],
      [t('Support type'), ...results.map(result => t(supportLabels[result.scheme.programType ?? 'direct_loan']))],
      [t('Profile fit (preliminary)'), ...results.map(result => `${result.matchScore}%`)],
      [t('Project cost range'), ...results.map(result => t(projectRange(result, language)))],
      [t('Funding amount'), ...results.map(result => t(fundingSummary(result, language)))],
      [t('Beneficiary rate'), ...results.map(result => t(rateSummary(result)))],
      [t('Repayment'), ...results.map(result => t(repaymentSummary(result)))],
      [t('Moratorium'), ...results.map(result => t(moratoriumSummary(result)))],
      [t('Indicative EMI'), ...results.map(result => result.estimatedMonthlyEmi === undefined ? t('Not published') : `${formatINR(result.estimatedMonthlyEmi, language)} ${t('per month; monthly equivalent only')}`)],
      [t('Income condition'), ...results.map(result => t(incomeSummary(result, language)))],
      [t('Why it matched'), ...results.map(result => result.matchReasons.join(' | '))],
      [t('Items to confirm'), ...results.map(result => result.caveats.join(' | ') || t('No open caveat listed by this preliminary screen'))],
      [t('Documents to prepare'), ...results.map(result => result.scheme.mandatoryDocuments.join(' | '))],
      [t('Official source'), ...results.map(result => result.scheme.sourceUrl)],
      [t('Source reviewed'), ...results.map(result => result.scheme.sourceReviewed)],
      [t('Notice'), ...results.map(() => t('Independent planning aid. Not an eligibility decision, loan offer, approval, or application.'))],
    ];
    const csv = `\uFEFF${rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')}`;
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'scheme-comparison.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section aria-labelledby="scheme-comparison-title" className="scheme-comparison overflow-hidden rounded-3xl border border-sky-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-sky-100 bg-sky-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-700 text-white"><ArrowLeftRight className="h-5 w-5" /></span>
          <div>
            <h3 id="scheme-comparison-title" className="text-lg font-bold tracking-tight text-slate-900">{t('Compare schemes with AI')}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('See the facts side by side, then ask AI to explain the differences.')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800">{results.length} / 3</span>
          <button type="button" onClick={downloadComparison} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-800 hover:border-sky-300 hover:bg-sky-100">
            <ArrowDownToLine className="h-3.5 w-3.5" /> {t('Download list')}
          </button>
        </div>
      </div>

      {results.length > 1 && <div className="border-b border-sky-100 p-5 sm:p-6"><AIInsightPanel tool="comparison" language={language} schemeIds={results.map(result => result.scheme.id)} compact /></div>}
      <div className="overflow-x-auto overscroll-x-contain" tabIndex={0} aria-labelledby="scheme-comparison-title">
        <div role="table" aria-label={t('Side-by-side scheme comparison')} className="min-w-[800px]">
          <div role="row" className="grid grid-cols-[160px_repeat(3,minmax(210px,1fr))] border-b border-sky-100">
            <div role="columnheader" className="sticky left-0 z-10 flex items-end border-r border-sky-100 bg-sky-50 px-4 py-4 text-xs font-semibold text-sky-900">{t('Scheme')}</div>
            {Array.from({ length: 3 }, (_, index) => {
              const result = results[index];
              return (
                <div role="columnheader" key={result?.scheme.id ?? `empty-${index}`} className="min-h-36 border-l border-slate-100 p-4">
                  {result ? (
                    <div className="flex h-full flex-col items-start justify-between gap-2">
                      <div className="flex w-full items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">{result.matchScore}% {t('possible fit')}</span>
                          <h4 className="mt-3 text-sm font-bold leading-snug text-slate-900">{result.scheme.name}</h4>
                          <p className="mt-1 text-xs text-slate-500">{result.scheme.corporation}</p>
                        </div>
                        <button type="button" onClick={() => onRemove(result.scheme.id)} aria-label={t(`Remove ${result.scheme.name} from comparison`)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <a href={result.scheme.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-sky-700 hover:underline">{t('Official source')} <ExternalLink className="h-3 w-3" /></a>
                        <span className="text-xs text-slate-500">{t('Checked')} {result.scheme.sourceReviewed}</span>
                      </div>
                    </div>
                  ) : <p className="pt-2 text-xs text-slate-400">{t('Pick one more scheme')}</p>}
                </div>
              );
            })}
          </div>

          <ComparisonRow label={t('Support type')}>
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-4 py-4 text-xs leading-relaxed font-semibold text-slate-800">{results[index] ? t(supportLabels[results[index].scheme.programType ?? 'direct_loan']) : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label={t('Project cost range')}>
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-4 py-4 text-xs leading-relaxed text-slate-700">{results[index] ? t(projectRange(results[index], language)) : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label={t('Support amount')}>
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-4 py-4 text-xs leading-relaxed text-slate-700">{results[index] ? t(fundingSummary(results[index], language)) : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label={t('Interest rate')}>
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-4 py-4 text-xs leading-relaxed text-slate-700">{results[index] ? t(rateSummary(results[index])) : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label={t('Payments / pause')}>
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-4 py-4 text-xs leading-relaxed text-slate-700">{results[index] ? <>{t(repaymentSummary(results[index]))}<br /><span className="text-slate-500">{t('Pause:')} {t(moratoriumSummary(results[index]))}</span></> : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label={t('Monthly payment')}>
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-4 py-4 text-xs leading-relaxed text-slate-700">{results[index] ? results[index].estimatedMonthlyEmi !== undefined ? <><b className="text-slate-900">{formatINR(results[index].estimatedMonthlyEmi!, language)}{language === 'hi' ? '/महीना' : '/mo'}</b><br /><span className="text-xs text-slate-500">{t('Estimate only; payments may differ')}</span></> : t('No monthly estimate') : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label={t('Income condition')}>
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-4 py-4 text-xs leading-relaxed text-slate-700">{results[index] ? t(incomeSummary(results[index], language)) : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label={t('Why it may fit')}>
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-4 py-4 text-xs leading-relaxed text-slate-700">{results[index] ? <><ul className="list-disc space-y-1 pl-4">{results[index].matchReasons.slice(0, 2).map(reason => <li key={reason}>{reason}</li>)}</ul>{results[index].caveats.length > 0 && <p className="mt-2 border-t border-sky-100 pt-2 text-sky-900"><b>{t('Check:')}</b> {results[index].caveats[0]}</p>}</> : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label={t('Documents to prepare')}>
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-4 py-4 text-xs leading-relaxed text-slate-700">{results[index] ? <>{results[index].scheme.mandatoryDocuments.slice(0, 3).map(document => <p key={document}>• {document}</p>)}{results[index].scheme.mandatoryDocuments.length > 3 && <span className="text-slate-500">{t(`${results[index].scheme.mandatoryDocuments.length - 3} more`)}</span>}</> : '—'}</div>)}
          </ComparisonRow>
          <div role="row" className="grid min-w-[800px] grid-cols-[160px_repeat(3,minmax(210px,1fr))] border-t border-sky-100 bg-sky-50/30">
            <div role="rowheader" className="sticky left-0 z-10 border-r border-sky-100 bg-sky-50 px-4 py-4 text-xs font-semibold text-sky-900">{t('Next step')}</div>
            {Array.from({ length: 3 }, (_, index) => {
              const result = results[index];
              return <div role="cell" key={result?.scheme.id ?? index} className="flex flex-wrap gap-2 border-l border-slate-100 p-4">{result && <>
                {result.recommendedLoanAmount !== undefined && <button type="button" onClick={() => onSelectForCalculator(result)} className="min-h-11 rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800">{t('Payment estimate')}</button>}
                {result.scheme.corporation === 'NSFDC' && result.scheme.channelPartnerTypes.length > 0 && <button type="button" onClick={() => onSelectForLocator(result.scheme.id)} className="min-h-11 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50">{t('Find agency')}</button>}
              </>}</div>;
            })}
          </div>
        </div>
      </div>
      <p className="border-t border-sky-100 px-5 py-3 text-xs text-slate-500 sm:hidden">{t('Swipe to see all schemes.')}</p>
      <p className="border-t border-sky-100 px-5 py-4 text-xs leading-relaxed text-slate-500 sm:px-6">{t('Check current rules, open dates, and final terms with the agency.')}</p>
    </section>
  );
}
