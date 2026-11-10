'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import AIInsightPanel from '@/components/AIInsightPanel';
import { ArrowRight, Calculator, Clock, ExternalLink, Info, MapPin, Percent } from 'lucide-react';
import { SCHEMES_DATABASE } from '@/lib/schemes-data';
import { formatLocalizedINR as formatINR, localizeScheme, tr } from '@/lib/ui-copy';

interface FinancialCalculatorProps {
  language: string;
  preselectedSchemeId?: string;
  preselectedProjectCost?: number;
  preselectedOwnContribution?: number;
  insightRequest?: number;
  onSelectLocator?: (schemeId: string) => void;
}

function calculateInstallment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const rate = annualRate / 1200;
  if (!rate) return Math.round(principal / months);
  const growth = (1 + rate) ** months;
  return Math.round((principal * rate * growth) / (growth - 1));
}

const CALCULATOR_SCHEMES = SCHEMES_DATABASE.filter(scheme =>
  scheme.maxLoanAmount !== undefined
  && scheme.maxLoanPercentage !== undefined
  && scheme.concessionalInterestRate !== undefined
  && scheme.repaymentTenureYears !== undefined,
);

export default function FinancialCalculator({
  language,
  preselectedSchemeId = 'nsfdc-tls',
  preselectedProjectCost,
  preselectedOwnContribution,
  insightRequest = 0,
  onSelectLocator,
}: FinancialCalculatorProps) {
  const t = (text: string) => tr(language, text);
  const insightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!insightRequest) return;
    const frame = window.requestAnimationFrame(() => {
      insightRef.current?.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [insightRequest]);
  const initialScheme = CALCULATOR_SCHEMES.find(scheme => scheme.id === preselectedSchemeId)
    ?? CALCULATOR_SCHEMES.find(scheme => scheme.id === 'nsfdc-tls')
    ?? CALCULATOR_SCHEMES[0];
  const initialCost = preselectedProjectCost && preselectedProjectCost > 0
    ? preselectedProjectCost
    : Math.min(initialScheme.maxProjectCost ?? 500000, 500000);

  const [selectedSchemeId, setSelectedSchemeId] = useState(initialScheme.id);
  const [projectCost, setProjectCost] = useState(initialCost);
  const [loanPercentage, setLoanPercentage] = useState(initialScheme.maxLoanPercentage ?? 0);
  const [interestRate, setInterestRate] = useState(initialScheme.concessionalInterestRate ?? 0);
  const [tenureYears, setTenureYears] = useState(initialScheme.repaymentTenureYears ?? 1);
  const [moratoriumMonths, setMoratoriumMonths] = useState(initialScheme.moratoriumPeriodMonths ?? 0);
  const [otherFunding, setOtherFunding] = useState(0);
  const [ownContribution, setOwnContribution] = useState(Math.min(initialCost, Math.max(0, preselectedOwnContribution ?? 0)));
  const [comparisonRate, setComparisonRate] = useState('');

  const selectedScheme = useMemo(
    () => CALCULATOR_SCHEMES.find(scheme => scheme.id === selectedSchemeId) ?? initialScheme,
    [initialScheme, selectedSchemeId],
  );
  const displayScheme = localizeScheme(selectedScheme, language);
  const projectCostWarning = selectedScheme.minProjectCost !== undefined && projectCost < selectedScheme.minProjectCost
    ? `This project is below the published minimum of ${formatINR(selectedScheme.minProjectCost, language)}.`
    : selectedScheme.maxProjectCost !== undefined && projectCost > selectedScheme.maxProjectCost
      ? `This project is above the published maximum of ${formatINR(selectedScheme.maxProjectCost, language)}.`
      : '';

  const handleSchemeChange = (schemeId: string) => {
    const nextScheme = CALCULATOR_SCHEMES.find(scheme => scheme.id === schemeId);
    if (!nextScheme) return;
    setSelectedSchemeId(schemeId);
    setProjectCost(Math.min(nextScheme.maxProjectCost ?? 500000, 500000));
    setLoanPercentage(nextScheme.maxLoanPercentage ?? 0);
    setInterestRate(nextScheme.concessionalInterestRate ?? 0);
    setTenureYears(nextScheme.repaymentTenureYears ?? 1);
    setMoratoriumMonths(nextScheme.moratoriumPeriodMonths ?? 0);
    setOtherFunding(0);
    setOwnContribution(0);
    setComparisonRate('');
  };

  const appliedOtherFunding = Math.min(projectCost, Math.max(0, otherFunding));
  const appliedOwnContribution = Math.min(projectCost, Math.max(0, ownContribution));
  const calculatedLoanAmount = Math.min(
    selectedScheme.maxLoanAmount ?? 0,
    projectCost * loanPercentage / 100,
    Math.max(0, projectCost - appliedOtherFunding),
  );
  const requiredOtherShare = Math.max(0, projectCost - appliedOtherFunding - calculatedLoanAmount);
  const fundingGap = Math.max(0, requiredOtherShare - appliedOwnContribution);
  const totalMonths = Math.max(1, Math.round(tenureYears * 12));
  const graceMonths = Math.min(totalMonths - 1, Math.max(0, Math.round(moratoriumMonths)));
  const repaymentMonths = Math.max(1, totalMonths - graceMonths);
  const monthlyRate = interestRate / 1200;
  const balanceAfterMoratorium = calculatedLoanAmount * (1 + monthlyRate) ** graceMonths;
  const monthlyEmi = calculateInstallment(balanceAfterMoratorium, interestRate, repaymentMonths);
  const totalPayment = monthlyEmi * repaymentMonths;
  const totalInterest = Math.max(0, totalPayment - calculatedLoanAmount);

  const comparisonRateValue = Number(comparisonRate);
  const hasComparisonRate = comparisonRate.trim() !== '' && Number.isFinite(comparisonRateValue) && comparisonRateValue > 0 && comparisonRateValue <= 40;
  const comparisonBalance = calculatedLoanAmount * (1 + comparisonRateValue / 1200) ** graceMonths;
  const comparisonEmi = hasComparisonRate ? calculateInstallment(comparisonBalance, comparisonRateValue, repaymentMonths) : 0;
  const comparisonInterest = hasComparisonRate ? Math.max(0, comparisonEmi * repaymentMonths - calculatedLoanAmount) : 0;
  const scenarioDifference = hasComparisonRate ? Math.max(0, comparisonInterest - totalInterest) : 0;

  const amortizationPreview = useMemo(() => {
    const rows: { month: number; isMoratorium: boolean; emi: number; interest: number; closingBalance: number }[] = [];
    let balance = calculatedLoanAmount;
    const rate = interestRate / 1200;
    for (let month = 1; month <= Math.min(6, totalMonths); month += 1) {
      const isMoratorium = month <= graceMonths;
      const interest = Math.round(balance * rate);
      let payment = monthlyEmi;
      if (isMoratorium) {
        balance += interest;
        payment = 0;
      } else {
        balance = Math.max(0, balance + interest - monthlyEmi);
      }
      rows.push({ month, isMoratorium, emi: payment, interest, closingBalance: Math.round(balance) });
    }
    return rows;
  }, [calculatedLoanAmount, graceMonths, interestRate, monthlyEmi, totalMonths]);

  return (
    <div className="entry-stack space-y-7">
      <section className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800"><Calculator className="entry-icon h-3.5 w-3.5" /> {t('AI-assisted repayment planning')}</span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{t('Estimate repayments. Ask AI to explain.')}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{t('Adjust the numbers for an estimate, then ask AI to explain payments, interest, and any funding gap.')}</p>
        </div>
        <div className="w-full min-w-0 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 md:w-80 md:shrink-0">
          <label htmlFor="calc-scheme-select" className="mb-1 block text-xs font-bold uppercase text-slate-600">{t('Scheme')}</label>
          <select id="calc-scheme-select" value={selectedSchemeId} onChange={event => handleSchemeChange(event.target.value)} className="w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:border-blue-500 focus:ring-blue-100">
            {CALCULATOR_SCHEMES.map(scheme => <option key={scheme.id} value={scheme.id}>{localizeScheme(scheme, language).name}</option>)}
          </select>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="space-y-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7 lg:col-span-7">
          <h3 className="border-b border-blue-100 pb-4 text-base font-bold text-slate-900">{t('Estimate assumptions')}</h3>

          <div>
            <label htmlFor="calc-cost" className="mb-2 flex flex-wrap items-center justify-between gap-1.5 text-sm font-semibold text-slate-700"><span>{t('Project or course cost')}</span><b className="font-mono text-slate-900">{formatINR(projectCost, language)}</b></label>
            <input id="calc-cost" type="number" min="0" step="1000" value={projectCost} onChange={event => { const nextCost = Math.max(0, Number(event.target.value) || 0); setProjectCost(nextCost); setOwnContribution(current => Math.min(current, nextCost)); setOtherFunding(current => Math.min(current, nextCost)); }} className="w-full min-h-12 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100" />
            {selectedScheme.maxProjectCost !== undefined && <p className="mt-1 text-xs text-slate-600">{t('Published project-cost ceiling:')} {formatINR(selectedScheme.maxProjectCost, language)}</p>}
            {projectCostWarning && <p className="mt-1 text-xs font-medium text-amber-800">{t(projectCostWarning)} {t('The estimate is illustrative and does not imply eligibility.')}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="calc-loan-share" className="mb-2 flex flex-wrap items-center justify-between gap-1.5 text-sm font-semibold text-slate-700"><span>{t('Loan share of project')}</span><b className="font-mono text-blue-700">{loanPercentage}%</b></label>
              <input id="calc-loan-share" type="range" min="0" max={selectedScheme.maxLoanPercentage ?? 0} step="5" value={loanPercentage} onChange={event => setLoanPercentage(Number(event.target.value))} className="h-10 w-full cursor-pointer accent-blue-600" />
              <p className="mt-1 text-xs text-slate-600">{t('Scheme maximum:')} {selectedScheme.maxLoanPercentage ?? 0}%</p>
            </div>
            <div>
            <label htmlFor="calc-other-funding" className="mb-2 flex flex-wrap items-center justify-between gap-1.5 text-sm font-semibold text-slate-700"><span>{t('Other confirmed support')}</span><b className="font-mono text-blue-700">{formatINR(appliedOtherFunding, language)}</b></label>
              <input id="calc-other-funding" type="number" min="0" max={projectCost} step="1000" value={appliedOtherFunding} onChange={event => setOtherFunding(Math.min(projectCost, Math.max(0, Number(event.target.value) || 0)))} className="w-full min-h-12 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100" />
              <p className="mt-1 text-xs text-slate-600">{t('No grant is counted yet. Add only support you have confirmed.')}</p>
            </div>
          </div>

          <div>
            <label htmlFor="calc-own-contribution" className="mb-2 flex flex-wrap items-center justify-between gap-1.5 text-sm font-semibold text-slate-700"><span>{t('Your own contribution')}</span><b className="font-mono text-blue-700">{formatINR(appliedOwnContribution, language)}</b></label>
            <input id="calc-own-contribution" type="number" min="0" max={projectCost} step="1000" value={appliedOwnContribution} onChange={event => setOwnContribution(Math.min(projectCost, Math.max(0, Number(event.target.value) || 0)))} className="w-full min-h-12 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="calc-rate" className="mb-2 flex flex-wrap items-center justify-between gap-1.5 text-sm font-semibold text-slate-700"><span>{t('Annual interest rate')}</span><b className="font-mono text-blue-700">{interestRate}%</b></label>
              <input id="calc-rate" type="range" min="0" max="30" step="0.25" value={interestRate} onChange={event => setInterestRate(Number(event.target.value))} className="h-10 w-full cursor-pointer accent-blue-600" />
              <p className="mt-1 text-xs text-slate-600">{t('Published rate:')} {selectedScheme.interestRateLabel ?? `${selectedScheme.concessionalInterestRate ?? 0}%`} {t('per year')}. {displayScheme.interestRateNote}</p>
            </div>
            <div>
              <label htmlFor="calc-tenure" className="mb-2 flex flex-wrap items-center justify-between gap-1.5 text-sm font-semibold text-slate-700"><span>{t('Total term')}</span><b className="font-mono text-slate-900">{tenureYears} {t('years')}</b></label>
              <input id="calc-tenure" type="range" min="1" max={Math.max(1, selectedScheme.repaymentTenureYears ?? 1)} step="1" value={tenureYears} onChange={event => setTenureYears(Number(event.target.value))} className="h-10 w-full cursor-pointer accent-blue-600" />
              <p className="mt-1 text-xs text-slate-600">{t('Published term:')} {displayScheme.repaymentTerms ?? `${selectedScheme.repaymentTenureYears ?? 1} ${t('years')}`}</p>
            </div>
          </div>

          <div>
              <label htmlFor="calc-moratorium" className="mb-2 flex flex-wrap items-center justify-between gap-1.5 text-sm font-semibold text-slate-700"><span><Clock className="mr-1 inline h-3.5 w-3.5 text-blue-600" />{t('Payment pause')}</span><b className="font-mono text-blue-700">{graceMonths} {t('months')}</b></label>
              <input id="calc-moratorium" type="range" min="0" max={Math.min(60, totalMonths - 1)} step="1" value={graceMonths} onChange={event => setMoratoriumMonths(Number(event.target.value))} className="h-10 w-full cursor-pointer accent-blue-600" />
            <p className="mt-1 text-xs text-slate-600">{t('Published term:')} {displayScheme.moratoriumTerms ?? `${selectedScheme.moratoriumPeriodMonths ?? 0} ${t('months')}`}</p>
          </div>

          <div className="grid gap-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 text-sm sm:grid-cols-2">
            <div><span className="block text-slate-600">{t('Estimated loan')}</span><b className="mt-0.5 block text-sm text-slate-900">{formatINR(calculatedLoanAmount, language)}</b></div>
            <div><span className="block text-slate-600">{t('Other funding')}</span><b className="mt-1 block text-base text-blue-700">{formatINR(appliedOtherFunding, language)}</b></div>
            <div><span className="block text-slate-600">{t('Your or partner share')}</span><b className="mt-0.5 block text-sm text-blue-700">{formatINR(requiredOtherShare, language)}</b></div>
            <div><span className="block text-slate-600">{t('Still to arrange')}</span><b className="mt-0.5 block text-sm text-rose-700">{formatINR(fundingGap, language)}</b></div>
          </div>
        </section>

        <div className="space-y-5 lg:col-span-5 lg:self-start lg:sticky lg:top-28">
          <section className="rounded-3xl border border-blue-600 bg-blue-700 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-blue-100">{t('Estimated monthly payment')}</span>
              <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white">{interestRate}% {t('per year')}</span>
            </div>
            <p className="mt-5 text-4xl font-extrabold tracking-tight">{formatINR(monthlyEmi, language)}<span className="ml-2 text-sm font-medium text-blue-100">{language === 'hi' ? '/ महीना' : '/ month'}</span></p>
            <p className="mt-3 text-sm leading-relaxed text-blue-100">{t(`After a ${graceMonths}-month pause · ${repaymentMonths} monthly payments in this estimate`)}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/20 pt-5 text-xs">
              <div><span className="block leading-relaxed text-blue-100">{t('Total interest estimate')}</span><b className="mt-0.5 block text-sm">{formatINR(totalInterest, language)}</b></div>
              <div><span className="block leading-relaxed text-blue-100">{t('Total to repay')}</span><b className="mt-0.5 block text-sm">{formatINR(totalPayment, language)}</b></div>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600"><Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />{t('This estimate adds interest each month during the pause. Your lender may use different dates or rules. Ask for the final payment plan.')}</div>
            <div>
              <label htmlFor="comparison-rate" className="mb-2 block text-sm font-semibold text-slate-700">{t('Compare another rate (optional)')}</label>
              <div className="flex items-center gap-2">
                <input id="comparison-rate" type="number" min="0" max="40" step="0.1" value={comparisonRate} onChange={event => setComparisonRate(event.target.value)} placeholder={t('Enter quoted rate')} className="w-full min-h-12 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100" />
                <span className="text-xs text-slate-600">% {t('per year')}</span>
              </div>
              {hasComparisonRate && <p className="mt-2 text-xs text-slate-600">{t(`At ${comparisonRateValue}%, your estimate is ${formatINR(comparisonEmi, language)}/month. Difference: ${formatINR(scenarioDifference, language)}.`)}</p>}
            </div>
          </section>

          <div ref={insightRef}>
            <AIInsightPanel key={insightRequest} tool="repayment" language={language} schemeIds={[selectedScheme.id]} autoGenerate={insightRequest > 0} repayment={{
              projectCost,
              principal: calculatedLoanAmount,
              annualRate: interestRate,
              graceMonths,
              repaymentMonths,
              monthlyEmi,
              totalInterest,
              totalPayment,
              ownContribution: appliedOwnContribution,
              otherFunding: appliedOtherFunding,
              fundingGap,
            }} />
          </div>

          <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-800">{t('First six modeled months')}</h3>
            <div className="space-y-2 text-xs">
              {amortizationPreview.map(row => (
                <div key={row.month} className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl p-3 ${row.isMoratorium ? 'bg-blue-50 text-blue-900' : 'bg-slate-50 text-slate-700'}`}>
                  <span className="font-semibold">{t('Month')} {row.month}</span>
                  <span>{row.isMoratorium ? t('Pause; no payment in estimate') : `${t('Payment:')} ${formatINR(row.emi, language)}`}</span>
                  <span className="text-xs text-slate-600">{t('Balance')} {formatINR(row.closingBalance, language)}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <a href={selectedScheme.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-blue-700 hover:underline">{t('Official terms')} <ExternalLink className="h-3.5 w-3.5" /></a>
            {onSelectLocator && <button type="button" onClick={() => onSelectLocator(selectedScheme.id)} className="min-h-12 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800"><MapPin className="h-3.5 w-3.5" /> {t('Find agency')} <ArrowRight className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>
      <p className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950"><Percent className="mt-0.5 h-4 w-4 shrink-0" />{t('Estimate only. Ask the lender about the final rate, fees, payment dates, pause, and rules.')}</p>
    </div>
  );
}
