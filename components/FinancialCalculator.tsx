'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Calculator, Clock, ExternalLink, Info, MapPin, Percent } from 'lucide-react';
import { SCHEMES_DATABASE } from '@/lib/schemes-data';
import { formatINR } from './SchemeCard';
import { localizeScheme, tr } from '@/lib/ui-copy';

interface FinancialCalculatorProps {
  language: string;
  preselectedSchemeId?: string;
  preselectedProjectCost?: number;
  preselectedOwnContribution?: number;
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
  onSelectLocator,
}: FinancialCalculatorProps) {
  const t = (text: string) => tr(language, text);
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
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800"><Calculator className="h-3.5 w-3.5" /> {t('Repayment estimate')}</span>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{t('Loan & repayment calculator')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('Change the numbers to estimate a monthly payment. The lender sets the final amount and dates.')}</p>
        </div>
        <div className="min-w-[260px] rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label htmlFor="calc-scheme-select" className="mb-1 block text-[11px] font-bold uppercase text-slate-600">{t('Scheme')}</label>
          <select id="calc-scheme-select" value={selectedSchemeId} onChange={event => handleSchemeChange(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500">
            {CALCULATOR_SCHEMES.map(scheme => <option key={scheme.id} value={scheme.id}>{localizeScheme(scheme, language).name}</option>)}
          </select>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7">
          <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wide text-slate-900">{t('Estimate assumptions')}</h3>

          <div>
            <label htmlFor="calc-cost" className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700"><span>{t('Project or course cost')}</span><b className="font-mono text-slate-900">{formatINR(projectCost, language)}</b></label>
            <input id="calc-cost" type="number" min="0" step="1000" value={projectCost} onChange={event => { const nextCost = Math.max(0, Number(event.target.value) || 0); setProjectCost(nextCost); setOwnContribution(current => Math.min(current, nextCost)); setOtherFunding(current => Math.min(current, nextCost)); }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            {selectedScheme.maxProjectCost !== undefined && <p className="mt-1 text-[10px] text-slate-500">{t('Published project-cost ceiling:')} {formatINR(selectedScheme.maxProjectCost, language)}</p>}
            {projectCostWarning && <p className="mt-1 text-xs font-medium text-amber-800">{t(projectCostWarning)} {t('The estimate is illustrative and does not imply eligibility.')}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="calc-loan-share" className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700"><span>{t('Loan share of project')}</span><b className="font-mono text-sky-700">{loanPercentage}%</b></label>
              <input id="calc-loan-share" type="range" min="0" max={selectedScheme.maxLoanPercentage ?? 0} step="5" value={loanPercentage} onChange={event => setLoanPercentage(Number(event.target.value))} className="w-full accent-sky-600" />
              <p className="mt-1 text-[10px] text-slate-500">{t('Scheme maximum:')} {selectedScheme.maxLoanPercentage ?? 0}%</p>
            </div>
            <div>
            <label htmlFor="calc-other-funding" className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700"><span>{t('Other confirmed support')}</span><b className="font-mono text-amber-700">{formatINR(appliedOtherFunding, language)}</b></label>
              <input id="calc-other-funding" type="number" min="0" max={projectCost} step="1000" value={appliedOtherFunding} onChange={event => setOtherFunding(Math.min(projectCost, Math.max(0, Number(event.target.value) || 0)))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <p className="mt-1 text-[10px] text-slate-500">{t('No grant is counted yet. Add only support you have confirmed.')}</p>
            </div>
          </div>

          <div>
            <label htmlFor="calc-own-contribution" className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700"><span>{t('Your own contribution')}</span><b className="font-mono text-indigo-700">{formatINR(appliedOwnContribution, language)}</b></label>
            <input id="calc-own-contribution" type="number" min="0" max={projectCost} step="1000" value={appliedOwnContribution} onChange={event => setOwnContribution(Math.min(projectCost, Math.max(0, Number(event.target.value) || 0)))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="calc-rate" className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700"><span>{t('Annual interest rate')}</span><b className="font-mono text-sky-700">{interestRate}%</b></label>
              <input id="calc-rate" type="range" min="0" max="30" step="0.25" value={interestRate} onChange={event => setInterestRate(Number(event.target.value))} className="w-full accent-sky-600" />
              <p className="mt-1 text-[10px] text-slate-500">{t('Published rate:')} {selectedScheme.interestRateLabel ?? `${selectedScheme.concessionalInterestRate ?? 0}%`} {t('per year')}. {displayScheme.interestRateNote}</p>
            </div>
            <div>
              <label htmlFor="calc-tenure" className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700"><span>{t('Total term')}</span><b className="font-mono text-slate-900">{tenureYears} {t('years')}</b></label>
              <input id="calc-tenure" type="range" min="1" max={Math.max(1, selectedScheme.repaymentTenureYears ?? 1)} step="1" value={tenureYears} onChange={event => setTenureYears(Number(event.target.value))} className="w-full accent-sky-600" />
              <p className="mt-1 text-[10px] text-slate-500">{t('Published term:')} {displayScheme.repaymentTerms ?? `${selectedScheme.repaymentTenureYears ?? 1} ${t('years')}`}</p>
            </div>
          </div>

          <div>
              <label htmlFor="calc-moratorium" className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700"><span><Clock className="mr-1 inline h-3.5 w-3.5 text-amber-600" />{t('Payment pause')}</span><b className="font-mono text-amber-800">{graceMonths} {t('months')}</b></label>
              <input id="calc-moratorium" type="range" min="0" max={Math.min(60, totalMonths - 1)} step="1" value={graceMonths} onChange={event => setMoratoriumMonths(Number(event.target.value))} className="w-full accent-amber-600" />
            <p className="mt-1 text-[10px] text-slate-500">{t('Published term:')} {displayScheme.moratoriumTerms ?? `${selectedScheme.moratoriumPeriodMonths ?? 0} ${t('months')}`}</p>
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
            <div><span className="block text-slate-500">{t('Estimated loan')}</span><b className="mt-0.5 block text-sm text-slate-900">{formatINR(calculatedLoanAmount, language)}</b></div>
            <div><span className="block text-slate-500">{t('Other funding')}</span><b className="mt-0.5 block text-sm text-amber-700">{formatINR(appliedOtherFunding, language)}</b></div>
            <div><span className="block text-slate-500">{t('Your or partner share')}</span><b className="mt-0.5 block text-sm text-indigo-700">{formatINR(requiredOtherShare, language)}</b></div>
            <div><span className="block text-slate-500">{t('Still to arrange')}</span><b className="mt-0.5 block text-sm text-rose-700">{formatINR(fundingGap, language)}</b></div>
          </div>
        </section>

        <div className="space-y-4 lg:col-span-5">
          <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 text-slate-900 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-sky-800">{t('Estimated monthly payment')}</span>
              <span className="rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[10px] text-sky-800">{interestRate}% {t('per year')}</span>
            </div>
            <p className="mt-3 text-3xl font-black">{formatINR(monthlyEmi, language)}<span className="ml-1 text-sm font-medium text-sky-700">{language === 'hi' ? '/ महीना' : '/ month'}</span></p>
            <p className="mt-1 text-xs text-slate-600">{t(`After a ${graceMonths}-month pause · ${repaymentMonths} monthly payments in this estimate`)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-sky-100 pt-3 text-xs">
              <div><span className="block text-slate-600">{t('Total interest estimate')}</span><b className="mt-0.5 block text-sm">{formatINR(totalInterest, language)}</b></div>
              <div><span className="block text-slate-600">{t('Total to repay')}</span><b className="mt-0.5 block text-sm">{formatINR(totalPayment, language)}</b></div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600"><Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />{t('This estimate adds interest each month during the pause. Your lender may use different dates or rules. Ask for the final payment plan.')}</div>
            <div>
              <label htmlFor="comparison-rate" className="mb-1 block text-xs font-semibold text-slate-700">{t('Compare another rate (optional)')}</label>
              <div className="flex items-center gap-2">
                <input id="comparison-rate" type="number" min="0" max="40" step="0.1" value={comparisonRate} onChange={event => setComparisonRate(event.target.value)} placeholder={t('Enter quoted rate')} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                <span className="text-xs text-slate-500">% {t('per year')}</span>
              </div>
              {hasComparisonRate && <p className="mt-2 text-xs text-slate-600">{t(`At ${comparisonRateValue}%, your estimate is ${formatINR(comparisonEmi, language)}/month. Difference: ${formatINR(scenarioDifference, language)}.`)}</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="mb-2 text-xs font-bold uppercase text-slate-600">{t('First six modeled months')}</h3>
            <div className="space-y-1.5 text-xs">
              {amortizationPreview.map(row => (
                <div key={row.month} className={`flex items-center justify-between gap-2 rounded-md p-2 ${row.isMoratorium ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>
                  <span className="font-semibold">{t('Month')} {row.month}</span>
                  <span>{row.isMoratorium ? t('Pause; no payment in estimate') : `${t('Payment:')} ${formatINR(row.emi, language)}`}</span>
                  <span className="text-[10px] text-slate-500">{t('Balance')} {formatINR(row.closingBalance, language)}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <a href={selectedScheme.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:underline">{t('Official terms')} <ExternalLink className="h-3.5 w-3.5" /></a>
            {onSelectLocator && <button type="button" onClick={() => onSelectLocator(selectedScheme.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 font-semibold text-white hover:bg-sky-800"><MapPin className="h-3.5 w-3.5" /> {t('Find agency')} <ArrowRight className="h-3.5 w-3.5" /></button>}
          </div>
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><Percent className="mt-0.5 h-4 w-4 shrink-0" />{t('Estimate only. Ask the lender about the final rate, fees, payment dates, pause, and rules.')}</p>
    </div>
  );
}
