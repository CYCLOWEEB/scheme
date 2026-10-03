'use client';

import React from 'react';
import { ArrowDownToLine, ArrowLeftRight, ExternalLink, X } from 'lucide-react';
import { SchemeMatchResult } from '@/lib/types';
import { formatINR } from '@/components/SchemeCard';

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

function projectRange(result: SchemeMatchResult): string {
  const { minProjectCost, maxProjectCost } = result.scheme;
  if (minProjectCost === undefined && maxProjectCost === undefined) return 'No project-cost limit listed in this summary';
  if (minProjectCost !== undefined && maxProjectCost !== undefined) return `${formatINR(minProjectCost)}–${formatINR(maxProjectCost)}`;
  if (maxProjectCost !== undefined) return `Up to ${formatINR(maxProjectCost)}`;
  return `From ${formatINR(minProjectCost!)}`;
}

function fundingSummary(result: SchemeMatchResult): string {
  const { scheme } = result;
  if (scheme.programType === 'credit_guarantee') {
    return scheme.financialHighlights?.find(item => item.label.toLowerCase().includes('guarantee'))?.value
      ?? 'Guarantee cover; lender decides the loan';
  }
  if (result.recommendedLoanAmount !== undefined) return `Indicative amount: ${formatINR(result.recommendedLoanAmount)}`;
  if (scheme.maxLoanAmount !== undefined) return `Up to ${formatINR(scheme.maxLoanAmount)}`;
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

function incomeSummary(result: SchemeMatchResult): string {
  const ceiling = result.scheme.maxIncomeCeiling;
  return ceiling === undefined ? 'No limit listed here; check scheme rules' : `Family income up to ${formatINR(ceiling)} per year`;
}

function ComparisonRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="row" className="grid min-w-[720px] grid-cols-[145px_repeat(3,minmax(190px,1fr))] border-b border-slate-100 last:border-b-0">
      <div role="rowheader" className="bg-slate-50 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      {children}
    </div>
  );
}

export default function SchemeComparison({ results, onRemove, onSelectForCalculator, onSelectForLocator }: SchemeComparisonProps) {
  const downloadComparison = () => {
    const rows = [
      ['Field', ...results.map(result => result.scheme.name)],
      ['Support type', ...results.map(result => supportLabels[result.scheme.programType ?? 'direct_loan'])],
      ['Profile fit (preliminary)', ...results.map(result => `${result.matchScore}%`)],
      ['Project cost range', ...results.map(projectRange)],
      ['Funding amount', ...results.map(fundingSummary)],
      ['Beneficiary rate', ...results.map(rateSummary)],
      ['Repayment', ...results.map(repaymentSummary)],
      ['Moratorium', ...results.map(moratoriumSummary)],
      ['Indicative EMI', ...results.map(result => result.estimatedMonthlyEmi === undefined ? 'Not published' : `${formatINR(result.estimatedMonthlyEmi)} per month; monthly equivalent only`)],
      ['Income condition', ...results.map(incomeSummary)],
      ['Why it matched', ...results.map(result => result.matchReasons.join(' | '))],
      ['Items to confirm', ...results.map(result => result.caveats.join(' | ') || 'No open caveat listed by this preliminary screen')],
      ['Documents to prepare', ...results.map(result => result.scheme.mandatoryDocuments.join(' | '))],
      ['Official source', ...results.map(result => result.scheme.sourceUrl)],
      ['Source reviewed', ...results.map(result => result.scheme.sourceReviewed)],
      ['Notice', ...results.map(() => 'Independent planning aid. Not an eligibility decision, loan offer, approval, or application.')],
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
    <section aria-labelledby="scheme-comparison-title" className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-sky-100 bg-sky-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white"><ArrowLeftRight className="h-4 w-4" /></span>
          <div>
            <h3 id="scheme-comparison-title" className="text-sm font-extrabold text-slate-900">Compare your shortlist</h3>
            <p className="mt-0.5 text-xs text-slate-600">Compare schemes. Ask the agency about final rules and amounts.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-bold text-sky-800">{results.length} of 3</span>
          <button type="button" onClick={downloadComparison} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100">
            <ArrowDownToLine className="h-3.5 w-3.5" /> Download list
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div role="table" aria-label="Side-by-side scheme comparison" className="min-w-[720px]">
          <div role="row" className="grid grid-cols-[145px_repeat(3,minmax(190px,1fr))] border-b border-slate-200">
            <div role="columnheader" className="flex items-end bg-slate-50 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Scheme</div>
            {Array.from({ length: 3 }, (_, index) => {
              const result = results[index];
              return (
                <div role="columnheader" key={result?.scheme.id ?? `empty-${index}`} className="min-h-28 border-l border-slate-100 p-3">
                  {result ? (
                    <div className="flex h-full flex-col items-start justify-between gap-2">
                      <div className="flex w-full items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700">{result.matchScore}% possible fit</span>
                          <h4 className="mt-1 text-xs font-extrabold leading-snug text-slate-900">{result.scheme.name}</h4>
                          <p className="mt-1 text-[10px] text-slate-500">{result.scheme.corporation}</p>
                        </div>
                        <button type="button" onClick={() => onRemove(result.scheme.id)} aria-label={`Remove ${result.scheme.name} from comparison`} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <a href={result.scheme.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 hover:underline">Official source <ExternalLink className="h-3 w-3" /></a>
                        <span className="text-[9px] text-slate-500">Checked {result.scheme.sourceReviewed}</span>
                      </div>
                    </div>
                  ) : <p className="pt-2 text-xs text-slate-400">Pick one more scheme</p>}
                </div>
              );
            })}
          </div>

          <ComparisonRow label="Support type">
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-3 py-3 text-xs font-semibold text-slate-800">{results[index] ? supportLabels[results[index].scheme.programType ?? 'direct_loan'] : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label="Project cost range">
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-3 py-3 text-xs text-slate-700">{results[index] ? projectRange(results[index]) : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label="Support amount">
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-3 py-3 text-xs text-slate-700">{results[index] ? fundingSummary(results[index]) : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label="Interest rate">
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-3 py-3 text-xs text-slate-700">{results[index] ? rateSummary(results[index]) : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label="Payments / pause">
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-3 py-3 text-xs leading-relaxed text-slate-700">{results[index] ? <>{repaymentSummary(results[index])}<br /><span className="text-slate-500">Pause: {moratoriumSummary(results[index])}</span></> : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label="Monthly payment">
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-3 py-3 text-xs text-slate-700">{results[index] ? results[index].estimatedMonthlyEmi !== undefined ? <><b className="text-slate-900">{formatINR(results[index].estimatedMonthlyEmi!)}/mo</b><br /><span className="text-[10px] text-slate-500">Estimate only; payments may differ</span></> : 'No monthly estimate' : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label="Income condition">
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-3 py-3 text-xs text-slate-700">{results[index] ? incomeSummary(results[index]) : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label="Why it may fit">
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-3 py-3 text-xs leading-relaxed text-slate-700">{results[index] ? <><ul className="list-disc space-y-1 pl-4">{results[index].matchReasons.slice(0, 2).map(reason => <li key={reason}>{reason}</li>)}</ul>{results[index].caveats.length > 0 && <p className="mt-2 border-t border-amber-100 pt-2 text-amber-800"><b>Check:</b> {results[index].caveats[0]}</p>}</> : '—'}</div>)}
          </ComparisonRow>
          <ComparisonRow label="Documents to prepare">
            {Array.from({ length: 3 }, (_, index) => <div role="cell" key={results[index]?.scheme.id ?? index} className="border-l border-slate-100 px-3 py-3 text-xs leading-relaxed text-slate-700">{results[index] ? <>{results[index].scheme.mandatoryDocuments.slice(0, 3).map(document => <p key={document}>• {document}</p>)}{results[index].scheme.mandatoryDocuments.length > 3 && <span className="text-slate-500">+ {results[index].scheme.mandatoryDocuments.length - 3} more</span>}</> : '—'}</div>)}
          </ComparisonRow>
          <div role="row" className="grid min-w-[720px] grid-cols-[145px_repeat(3,minmax(190px,1fr))] border-t border-slate-200 bg-slate-50/60">
            <div role="rowheader" className="px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">Next step</div>
            {Array.from({ length: 3 }, (_, index) => {
              const result = results[index];
              return <div role="cell" key={result?.scheme.id ?? index} className="flex flex-wrap gap-2 border-l border-slate-100 p-3">{result && <>
                {result.recommendedLoanAmount !== undefined && <button type="button" onClick={() => onSelectForCalculator(result)} className="rounded-lg bg-sky-700 px-2.5 py-2 text-[10px] font-bold text-white hover:bg-sky-800">Payment estimate</button>}
                {result.scheme.corporation === 'NSFDC' && result.scheme.channelPartnerTypes.length > 0 && <button type="button" onClick={() => onSelectForLocator(result.scheme.id)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-100">Find agency</button>}
              </>}</div>;
            })}
          </div>
        </div>
      </div>
      <p className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-500 sm:hidden">Swipe to see all schemes.</p>
      <p className="border-t border-slate-100 px-4 py-3 text-[10px] leading-relaxed text-slate-500">Check current rules, open dates, and final terms with the agency.</p>
    </section>
  );
}
