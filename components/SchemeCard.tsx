'use client';

import React from 'react';
import { SchemeMatchResult } from '@/lib/types';
import { formatLocalizedINR, localizeScheme, tr } from '@/lib/ui-copy';
import { SCHEMES_DATABASE } from '@/lib/schemes-data';
import { 
  CheckCircle2, 
  AlertCircle, 
  Percent, 
  Clock, 
  Wallet, 
  MapPin, 
  Sparkles,
  IndianRupee,
  ArrowLeftRight,
} from 'lucide-react';

interface SchemeCardProps {
  language: string;
  result: SchemeMatchResult;
  onSelectForCalculator: (result: SchemeMatchResult) => void;
  onSelectForLocator: (schemeId: string) => void;
  onAskAi: (schemeName: string) => void;
  isCompared: boolean;
  canCompare: boolean;
  onToggleCompare: (schemeId: string) => void;
}

export function formatINR(val: number, language = 'en'): string {
  return formatLocalizedINR(val, language);
}

export default function SchemeCard({
  language,
  result,
  onSelectForCalculator,
  onSelectForLocator,
  onAskAi,
  isCompared,
  canCompare,
  onToggleCompare,
}: SchemeCardProps) {
  const scheme = localizeScheme(result.scheme, language);
  const matchScore = result.matchScore;
  const matchReasons = result.matchReasons.map(text => tr(language, text));
  const caveats = result.caveats.map(text => tr(language, text));
  const { recommendedLoanAmount, estimatedMonthlyEmi } = result;
  const t = (text: string) => tr(language, text);
  const canShowLoanEstimate = recommendedLoanAmount !== undefined && estimatedMonthlyEmi !== undefined;
  const programType = scheme.programType ?? 'direct_loan';
  const canShowNsfDcDirectory = scheme.corporation === 'NSFDC' && scheme.channelPartnerTypes.length > 0;
  const programLabels = {
    direct_loan: 'Loan',
    credit_guarantee: 'Credit guarantee',
    credit_linked_subsidy: 'Credit-linked subsidy',
    business_support: 'Business support',
  } as const;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'border-sky-200 bg-sky-50 text-sky-800';
    if (score >= 70) return 'border-blue-200 bg-blue-50 text-blue-800';
    if (score >= 50) return 'border-sky-100 bg-white text-sky-700';
    return 'border-slate-200 bg-white text-slate-600';
  };

  return (
    <div 
      id={`scheme-card-${scheme.id}`}
      className={`scheme-card lift-on-hover flex min-w-0 flex-col justify-between overflow-hidden rounded-3xl border bg-white shadow-sm ${isCompared ? 'border-sky-400 ring-2 ring-sky-100' : 'border-sky-100 hover:border-sky-300'}`}
    >
      <div>
        {/* Card Header with Corporation & Match Score */}
        <div className="border-b border-slate-100 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 basis-[230px]">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800">
                  {t(scheme.corporation)}
                </span>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                  {t(programLabels[programType])}
                </span>
                <span className="rounded-full border border-slate-100 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                  {scheme.categoryTag}
                </span>
              </div>
              <h3 className="text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
                {scheme.name}
              </h3>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                {scheme.hindiName}
              </p>
            </div>

            {/* Match Badge */}
            <div className="shrink-0">
              <div className={`inline-flex min-w-24 flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 ${getScoreColor(matchScore)}`}>
                <span className="text-xl font-bold tracking-tight">{matchScore}%</span>
                <span className="text-[10px] font-semibold tracking-wide">{t('POSSIBLE FIT')}</span>
              </div>
              <p className="mt-2 max-w-28 text-[10px] leading-relaxed text-slate-500">{t('Source reviewed')} {scheme.sourceReviewed}</p>
            </div>
          </div>
        </div>

        {/* Scheme terms adapt to loans, guarantees, subsidies, and business support. */}
        {scheme.maxLoanPercentage !== undefined && scheme.maxLoanAmount !== undefined
          && scheme.concessionalInterestRate !== undefined && scheme.repaymentTenureYears !== undefined ? (
          <div className="scheme-terms grid grid-cols-1 divide-y divide-sky-100 border-b border-slate-100 bg-sky-50/30 px-5 py-3 text-center sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-3">
            <div className="px-2 py-2">
              <span className="text-xs text-slate-500 flex items-center justify-center gap-1"><Percent className="w-3 h-3 text-sky-600" /> {t('Interest rate')}</span>
              <p className="text-base font-bold text-sky-700 mt-0.5">{scheme.interestRateLabel ?? `${scheme.concessionalInterestRate}%`} <span className="text-[10px] font-normal text-slate-500">{t('per year')}</span></p>
              {scheme.interestRateNote && <p className="mt-1 text-xs leading-relaxed text-slate-500">{scheme.interestRateNote}</p>}
            </div>
            <div className="px-2 py-2">
              <span className="text-xs text-slate-500 flex items-center justify-center gap-1"><Wallet className="w-3 h-3 text-sky-600" /> {t('Max loan')}</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">{formatLocalizedINR(scheme.maxLoanAmount, language)}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('Up to')} {scheme.maxLoanPercentage}% {t('of cost')}</p>
            </div>
            <div className="px-2 py-2">
              <span className="text-xs text-slate-500 flex items-center justify-center gap-1"><Clock className="w-3 h-3 text-sky-600" /> {t('Payment pause')}</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">{scheme.moratoriumTerms ?? t(`${scheme.moratoriumPeriodMonths ?? 0} months`)}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('Tenure:')} {scheme.repaymentTenureYears} {t('Years')}</p>
            </div>
          </div>
        ) : scheme.financialHighlights?.length ? (
          <div className="grid grid-cols-1 divide-y divide-sky-100 border-b border-slate-100 bg-sky-50/30 px-3 py-3 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {scheme.financialHighlights.map(item => (
              <div key={item.label} className="px-2 py-2 text-center">
                <span className="text-xs text-slate-500">{item.label}</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{item.value}</p>
                {item.note && <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.note}</p>}
              </div>
            ))}
          </div>
        ) : null}

        {/* Estimated EMI & Interest Savings Highlight */}
        {canShowLoanEstimate && (
        <div className="border-b border-sky-100 bg-sky-50/70 p-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-sky-900">
                {t('Possible loan amount')}
              </span>
              <p className="mt-1 flex items-center text-2xl font-bold tracking-tight text-slate-900">
                <IndianRupee className="w-4 h-4 text-sky-700" />
                {recommendedLoanAmount!.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-600">
                {t('Monthly estimate')}
              </span>
              <p className="mt-1 text-xl font-bold tracking-tight text-sky-700">
                ₹{estimatedMonthlyEmi!.toLocaleString('en-IN')}<span className="text-[10px] text-slate-500">{language === 'hi' ? '/महीना' : '/mo'}</span>
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-500">{t('Estimate only. Ask the lender for your payment plan.')}</p>
        </div>
        )}

        {/* Match Reasons & Caveats */}
        <div className="space-y-5 p-5 sm:p-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">
              {t('Why it may fit')}
            </h4>
            {matchReasons.slice(0, 3).map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                <span>{reason}</span>
              </div>
            ))}
            {caveats.length > 0 && (
              <div className="mt-4 space-y-2 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                {caveats.slice(0, 2).map((cav, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-sky-900">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                    <span>{cav}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Overview */}
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
            {scheme.overview}
          </p>
          <details className="rounded-xl border border-sky-100 bg-white">
            <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-sky-50/50">{t('Scheme details')}</summary>
            <div className="grid gap-5 border-t border-sky-100 p-4 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-700">{t('Benefits and support')}</h4>
                <ul className="mt-1 space-y-1.5 text-xs leading-relaxed text-slate-700">
                  {scheme.keyBenefits.map(benefit => <li key={benefit}>• {benefit}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-700">{t('Eligibility')}</h4>
                <ul className="mt-1 space-y-1.5 text-xs leading-relaxed text-slate-700">
                  {scheme.eligibilityBullets.map(item => <li key={item}>• {item}</li>)}
                </ul>
              </div>
            </div>
          </details>
          <p className="text-xs leading-relaxed text-slate-500">{t('This is an early check, not approval. Ask the agency about final rules.')}</p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 bg-sky-50/30 px-5 py-4 sm:px-6">
        <button
          id={`ask-ai-${scheme.id}`}
          onClick={() => onAskAi(SCHEMES_DATABASE.find(item => item.id === scheme.id)?.name ?? scheme.name)}
          className="button-motion flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>{t('Ask a question')}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id={`compare-scheme-${scheme.id}`}
            type="button"
            aria-pressed={isCompared}
            disabled={!isCompared && !canCompare}
            onClick={() => onToggleCompare(scheme.id)}
            className={`button-motion inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${isCompared
              ? 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800'
              : canCompare
                ? 'border-sky-200 bg-white text-sky-800 hover:bg-sky-50'
                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
            }`}
            title={!isCompared && !canCompare ? t('Remove a scheme from the comparison first') : undefined}
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>{isCompared ? t('Added to compare') : t('Compare')}</span>
          </button>
          {canShowLoanEstimate && (
          <button
            id={`calc-scheme-${scheme.id}`}
            onClick={() => onSelectForCalculator(result)}
            className="button-motion min-h-11 rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-50"
          >
            {t('Monthly payment')}
          </button>
          )}
          {canShowNsfDcDirectory && (
          <button
            id={`locate-partner-${scheme.id}`}
            onClick={() => onSelectForLocator(scheme.id)}
            className="button-motion flex min-h-11 items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-800"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{t('Find agency')}</span>
          </button>
          )}
        </div>
      </div>
      <div className="bg-sky-50/30 px-5 pb-5 sm:px-6">
        {scheme.availabilityNote && <p className="mb-3 text-xs leading-relaxed text-sky-900">{scheme.availabilityNote}</p>}
        <a href={scheme.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-sky-700 hover:underline">
          {t('Official scheme details')} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}
