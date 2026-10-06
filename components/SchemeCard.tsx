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
    if (score >= 85) return 'bg-sky-600 text-white';
    if (score >= 70) return 'bg-blue-600 text-white';
    if (score >= 50) return 'bg-amber-500 text-white';
    return 'bg-slate-600 text-white';
  };

  return (
    <div 
      id={`scheme-card-${scheme.id}`}
      className="lift-on-hover bg-white rounded-xl border border-slate-200 shadow-xs hover:border-sky-200 overflow-hidden flex flex-col justify-between"
    >
      <div>
        {/* Card Header with Corporation & Match Score */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-sky-50/40 via-white to-slate-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                  {t(scheme.corporation)}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100">
                  {t(programLabels[programType])}
                </span>
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700">
                  {scheme.categoryTag}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {scheme.name}
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                {scheme.hindiName}
              </p>
            </div>

            {/* Match Badge */}
            <div className="text-right shrink-0">
              <div className={`px-2.5 py-1 rounded-lg text-xs font-black shadow-xs inline-flex items-center gap-1 ${getScoreColor(matchScore)}`}>
                <span>{matchScore}%</span>
                <span className="text-[10px] font-medium opacity-90">{t('POSSIBLE FIT')}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{t('Source reviewed')} {scheme.sourceReviewed}</p>
            </div>
          </div>
        </div>

        {/* Scheme terms adapt to loans, guarantees, subsidies, and business support. */}
        {scheme.maxLoanPercentage !== undefined && scheme.maxLoanAmount !== undefined
          && scheme.concessionalInterestRate !== undefined && scheme.repaymentTenureYears !== undefined ? (
          <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/70 border-b border-slate-100 text-center py-3 px-2">
            <div>
              <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1"><Percent className="w-3 h-3 text-sky-600" /> {t('Interest rate')}</span>
              <p className="text-sm font-extrabold text-sky-700 mt-0.5">{scheme.interestRateLabel ?? `${scheme.concessionalInterestRate}%`} <span className="text-[10px] font-normal text-slate-500">{t('per year')}</span></p>
              {scheme.interestRateNote && <p className="text-[10px] text-slate-500 mt-0.5">{scheme.interestRateNote}</p>}
            </div>
            <div>
              <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1"><Wallet className="w-3 h-3 text-indigo-600" /> {t('Max loan')}</span>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">{formatLocalizedINR(scheme.maxLoanAmount, language)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{t('Up to')} {scheme.maxLoanPercentage}% {t('of cost')}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1"><Clock className="w-3 h-3 text-amber-600" /> {t('Payment pause')}</span>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">{scheme.moratoriumTerms ?? t(`${scheme.moratoriumPeriodMonths ?? 0} months`)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{t('Tenure:')} {scheme.repaymentTenureYears} {t('Years')}</p>
            </div>
          </div>
        ) : scheme.financialHighlights?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/70 border-b border-slate-100 py-3 px-3">
            {scheme.financialHighlights.map(item => (
              <div key={item.label} className="px-2 py-2 text-center">
                <span className="text-[11px] text-slate-500">{item.label}</span>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">{item.value}</p>
                {item.note && <p className="text-[10px] leading-relaxed text-slate-500 mt-0.5">{item.note}</p>}
              </div>
            ))}
          </div>
        ) : null}

        {/* Estimated EMI & Interest Savings Highlight */}
        {canShowLoanEstimate && (
        <div className="p-4 bg-sky-50/60 border-b border-sky-100/80">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-sky-950 uppercase tracking-wider">
                {t('Possible loan amount')}
              </span>
              <p className="text-lg font-black text-slate-900 flex items-center">
                <IndianRupee className="w-4 h-4 text-sky-700" />
                {recommendedLoanAmount!.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-600">
                {t('Monthly estimate')}
              </span>
              <p className="text-base font-extrabold text-sky-700">
                ₹{estimatedMonthlyEmi!.toLocaleString('en-IN')}<span className="text-[10px] text-slate-500">{language === 'hi' ? '/महीना' : '/mo'}</span>
              </p>
            </div>
          </div>

          <p className="mt-2 text-[10px] text-slate-500">{t('Estimate only. Ask the lender for your payment plan.')}</p>
        </div>
        )}

        {/* Match Reasons & Caveats */}
        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('Why it may fit')}
            </h4>
            {matchReasons.slice(0, 3).map((reason, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
            {caveats.length > 0 && (
              <div className="mt-2 pt-1 border-t border-slate-100">
                {caveats.slice(0, 2).map((cav, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-amber-700 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{cav}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Overview */}
          <p className="text-xs text-slate-600 line-clamp-2 pt-1">
            {scheme.overview}
          </p>
          <details className="rounded-lg border border-slate-200 bg-white">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-sky-800">{t('Scheme details')}</summary>
            <div className="grid gap-4 border-t border-slate-100 p-3 sm:grid-cols-2">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('Benefits and support')}</h4>
                <ul className="mt-1 space-y-1.5 text-xs leading-relaxed text-slate-700">
                  {scheme.keyBenefits.map(benefit => <li key={benefit}>• {benefit}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t('Eligibility')}</h4>
                <ul className="mt-1 space-y-1.5 text-xs leading-relaxed text-slate-700">
                  {scheme.eligibilityBullets.map(item => <li key={item}>• {item}</li>)}
                </ul>
              </div>
            </div>
          </details>
          <p className="text-[10px] text-slate-500">{t('This is an early check, not approval. Ask the agency about final rules.')}</p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <button
          id={`ask-ai-${scheme.id}`}
          onClick={() => onAskAi(SCHEMES_DATABASE.find(item => item.id === scheme.id)?.name ?? scheme.name)}
          className="button-motion min-h-10 text-xs text-slate-600 hover:text-sky-700 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>{t('Ask a question')}</span>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            id={`compare-scheme-${scheme.id}`}
            type="button"
            aria-pressed={isCompared}
            disabled={!isCompared && !canCompare}
            onClick={() => onToggleCompare(scheme.id)}
            className={`button-motion min-h-10 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${isCompared
              ? 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800'
              : canCompare
                ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
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
            className="button-motion min-h-10 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors"
          >
            {t('Monthly payment')}
          </button>
          )}
          {canShowNsfDcDirectory && (
          <button
            id={`locate-partner-${scheme.id}`}
            onClick={() => onSelectForLocator(scheme.id)}
            className="button-motion min-h-10 text-xs font-semibold px-3.5 py-2 rounded-lg bg-sky-700 text-white hover:bg-sky-800 transition-colors flex items-center gap-1 shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{t('Find agency')}</span>
          </button>
          )}
        </div>
      </div>
      <div className="px-4 pb-3 bg-slate-50">
        {scheme.availabilityNote && <p className="mb-2 text-[10px] leading-relaxed text-amber-800">{scheme.availabilityNote}</p>}
        <a href={scheme.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-sky-700 hover:underline inline-flex items-center gap-1">
          {t('Official scheme details')} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}
