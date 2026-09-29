'use client';

import React from 'react';
import { SchemeMatchResult } from '@/lib/types';
import { 
  CheckCircle2, 
  AlertCircle, 
  Percent, 
  Clock, 
  Wallet, 
  MapPin, 
  Sparkles,
  IndianRupee,
} from 'lucide-react';

interface SchemeCardProps {
  result: SchemeMatchResult;
  onSelectForCalculator: (result: SchemeMatchResult) => void;
  onSelectForLocator: (schemeId: string) => void;
  onAskAi: (schemeName: string) => void;
}

export function formatINR(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export default function SchemeCard({
  result,
  onSelectForCalculator,
  onSelectForLocator,
  onAskAi
}: SchemeCardProps) {
  const { scheme, matchScore, matchReasons, caveats, recommendedLoanAmount, estimatedMonthlyEmi } = result;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-sky-600 text-white';
    if (score >= 70) return 'bg-blue-600 text-white';
    if (score >= 50) return 'bg-amber-500 text-white';
    return 'bg-slate-600 text-white';
  };

  return (
    <div 
      id={`scheme-card-${scheme.id}`}
      className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
    >
      <div>
        {/* Card Header with Corporation & Match Score */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-sky-50/40 via-white to-slate-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                  {scheme.corporation}
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
                <span className="text-[10px] font-medium opacity-90">PROFILE FIT</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Source reviewed {scheme.sourceReviewed}</p>
            </div>
          </div>
        </div>

        {/* Financial Highlights Pill Grid */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/70 border-b border-slate-100 text-center py-3 px-2">
          <div>
            <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <Percent className="w-3 h-3 text-sky-600" /> Concessional Rate
            </span>
            <p className="text-sm font-extrabold text-sky-700 mt-0.5">
              {scheme.interestRateLabel ?? `${scheme.concessionalInterestRate}%`} <span className="text-[10px] font-normal text-slate-500">p.a.</span>
            </p>
            {scheme.interestRateNote && <p className="text-[10px] text-slate-500 mt-0.5">{scheme.interestRateNote}</p>}
          </div>

          <div>
            <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <Wallet className="w-3 h-3 text-indigo-600" /> Max Loan Limit
            </span>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">
              {formatINR(scheme.maxLoanAmount)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Up to {scheme.maxLoanPercentage}% project
            </p>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" /> Moratorium
            </span>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                {scheme.moratoriumTerms ?? `${scheme.moratoriumPeriodMonths} Months`}
              </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Tenure: {scheme.repaymentTenureYears} Years
            </p>
          </div>
        </div>

        {/* Estimated EMI & Interest Savings Highlight */}
        <div className="p-4 bg-sky-50/60 border-b border-sky-100/80">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-sky-950 uppercase tracking-wider">
                Recommended Loan Assistance
              </span>
              <p className="text-lg font-black text-slate-900 flex items-center">
                <IndianRupee className="w-4 h-4 text-sky-700" />
                {recommendedLoanAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-medium text-slate-600">
                Est. Monthly EMI
              </span>
              <p className="text-base font-extrabold text-sky-700">
                ₹{estimatedMonthlyEmi.toLocaleString('en-IN')}<span className="text-[10px] text-slate-500">/mo</span>
              </p>
            </div>
          </div>

          <p className="mt-2 text-[10px] text-slate-500">Illustrative monthly equivalent; actual repayment frequency and interest treatment may differ. Confirm with the lender.</p>
        </div>

        {/* Match Reasons & Caveats */}
        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Preliminary profile fit; confirm these items:
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
          <p className="text-[10px] text-slate-500">This is a preliminary screen, not an eligibility decision or loan approval.</p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <button
          id={`ask-ai-${scheme.id}`}
          onClick={() => onAskAi(scheme.name)}
          className="text-xs text-slate-600 hover:text-sky-700 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Ask AI Advisor</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            id={`calc-scheme-${scheme.id}`}
            onClick={() => onSelectForCalculator(result)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors"
          >
            Detailed EMI
          </button>
          <button
            id={`locate-partner-${scheme.id}`}
            onClick={() => onSelectForLocator(scheme.id)}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors flex items-center gap-1 shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Official partner list</span>
          </button>
        </div>
      </div>
      <div className="px-4 pb-3 bg-slate-50">
        <a href={scheme.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-sky-700 hover:underline inline-flex items-center gap-1">
          Official scheme details <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}
