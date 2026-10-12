'use client';

import React, { useMemo, useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  FileCheck2,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { UserProfile, SchemeMatchResult } from '@/lib/types';
import { matchSchemes } from '@/lib/rule-engine';
import { formatINR } from '@/components/SchemeCard';
import { localizeScheme, tr } from '@/lib/ui-copy';
import shopImage from '../images/shop2.0.jpg';
import studentLoanImage from '../images/student_loan.jpeg';
import tailoringImage from '../images/tailor.jpeg';
import sanitationImage from '../images/sanitation.jpeg';

interface DemoStudioProps {
  language: string;
  onGetSchemes: () => void;
  onLoadProfile: (profile: UserProfile) => void;
  onSelectForCalculator: (result: SchemeMatchResult) => void;
  onSelectForLocator: (schemeId: string) => void;
  onOpenDocuments: (schemeId: string) => void;
}

const DEMO_SCENARIOS: {
  id: string;
  title: string;
  subtitle: string;
  image: StaticImageData;
  imageAlt: string;
  profile: UserProfile;
}[] = [
  {
    id: 'micro',
    title: 'Kirana shop',
    subtitle: 'Small business · ₹1.2 lakh',
    image: shopImage,
    imageAlt: 'A small shop in a busy Indian market',
    profile: {
      name: 'Demo applicant', category: 'SC', categoryProvided: true, annualFamilyIncome: 140000, incomeProvided: true,
      state: 'Uttar Pradesh', district: 'Lucknow', projectType: 'micro_business', projectTypeProvided: true,
      estimatedCost: 120000, ownContribution: 10000, hasCasteCertificate: true, hasIncomeCertificate: true, hasDPR: false,
      age: 28, newEnterpriseStatus: 'yes', streetVendorStatus: 'yes', scStOwnedMseStatus: 'yes', projectLocationArea: 'urban',
      hasAdmission: false, hasSanitationWorkerEligibility: false, hasPreviousTarunRepayment: false, hasEighthGradeEducation: false,
    },
  },
  {
    id: 'education',
    title: 'Student loan',
    subtitle: 'Study fees · ₹25 lakh',
    image: studentLoanImage,
    imageAlt: 'Graduation cap and savings for study costs',
    profile: {
      name: 'Demo applicant', category: 'SC', categoryProvided: true, annualFamilyIncome: 320000, incomeProvided: true,
      state: 'Delhi', district: 'Central Delhi', projectType: 'education_abroad', projectTypeProvided: true,
      estimatedCost: 2500000, ownContribution: 150000, hasCasteCertificate: true, hasIncomeCertificate: true, hasDPR: true,
      hasAdmission: true, hasSanitationWorkerEligibility: false, age: 22, newEnterpriseStatus: 'unknown',
      streetVendorStatus: 'unknown', scStOwnedMseStatus: 'unknown', projectLocationArea: 'unknown',
      hasPreviousTarunRepayment: false, hasEighthGradeEducation: false,
    },
  },
  {
    id: 'artisan',
    title: 'Tailoring work',
    subtitle: 'Tools · ₹1.8 lakh',
    image: tailoringImage,
    imageAlt: 'Sewing machine and tailoring workspace',
    profile: {
      name: 'Demo applicant', category: 'SC', categoryProvided: true, annualFamilyIncome: 210000, incomeProvided: true,
      state: 'Maharashtra', district: 'Pune', projectType: 'traditional_trade', projectTypeProvided: true,
      estimatedCost: 180000, ownContribution: 18000, hasCasteCertificate: true, hasIncomeCertificate: true, hasDPR: true,
      age: 34, traditionalTrade: 'Tailor', newEnterpriseStatus: 'yes', streetVendorStatus: 'unknown',
      scStOwnedMseStatus: 'yes', projectLocationArea: 'urban', hasAdmission: false,
      hasSanitationWorkerEligibility: false, hasPreviousTarunRepayment: false, hasEighthGradeEducation: true,
    },
  },
  {
    id: 'sanitation',
    title: 'Sanitation equipment',
    subtitle: 'Equipment · ₹15 lakh',
    image: sanitationImage,
    imageAlt: 'Hands being washed under running water',
    profile: {
      name: 'Demo applicant', category: 'SafaiKaramchari', categoryProvided: true, annualFamilyIncome: 160000, incomeProvided: true,
      state: 'Delhi', district: 'East Delhi', projectType: 'sanitation_mech', projectTypeProvided: true,
      estimatedCost: 1500000, ownContribution: 50000, hasCasteCertificate: true, hasIncomeCertificate: true, hasDPR: true,
      hasAdmission: false, hasSanitationWorkerEligibility: true, age: 32, newEnterpriseStatus: 'unknown',
      streetVendorStatus: 'unknown', scStOwnedMseStatus: 'unknown', projectLocationArea: 'urban',
      hasPreviousTarunRepayment: false, hasEighthGradeEducation: false,
    },
  },
];

const ROUTE_LABELS = {
  direct_loan: 'Concessional loan',
  credit_guarantee: 'Credit guarantee',
  credit_linked_subsidy: 'Credit-linked subsidy',
  business_support: 'Business support',
} as const;

export default function DemoStudio({ language, onGetSchemes, onLoadProfile, onSelectForCalculator, onSelectForLocator, onOpenDocuments }: DemoStudioProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(DEMO_SCENARIOS[0].id);
  const scenario = DEMO_SCENARIOS.find(item => item.id === selectedScenarioId) ?? DEMO_SCENARIOS[0];
  const matches = useMemo(() => matchSchemes(scenario.profile), [scenario]);
  const topMatch = matches[0];
  const localizedTopMatch = topMatch ? { ...topMatch, scheme: localizeScheme(topMatch.scheme, language) } : undefined;

  return (
    <div className="demo-studio flex min-h-0 flex-1 flex-col gap-7">
      <section className="goal-section overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-sm">
        <div className="goal-intro relative flex flex-col justify-between gap-6 overflow-hidden px-5 py-7 sm:px-8 sm:py-9 lg:flex-row lg:items-center lg:px-10">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/90 px-3 py-1.5 text-xs font-semibold text-blue-700"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{tr(language, 'Start here · No sign-in')}</span>
            <h2 className="mt-5 max-w-xl text-[2rem] font-bold leading-[1.2] tracking-tight text-blue-950 sm:text-[2.6rem]">{tr(language, 'A simpler path to loan options.')}</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{tr(language, 'Choose a goal to explore schemes that may fit, estimated payments, and where to apply. Apna raasta yahin se shuru karein.')}</p>
          </div>
          <div className="relative z-10 flex shrink-0 flex-col items-start gap-5 lg:items-center">
            <div className="flex items-center justify-center lg:h-[140px] lg:w-[170px]">
              <button type="button" onClick={onGetSchemes} className="button-motion inline-flex min-h-14 shrink-0 items-center justify-center gap-3 whitespace-nowrap rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm shadow-blue-600/15 hover:bg-blue-700">
                {tr(language, 'Get schemes')} <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </button>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-2 text-xs font-medium text-blue-800"><ShieldCheck className="h-4 w-4 text-blue-600" /> {tr(language, 'Sample profile · stays on this page')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6 lg:grid-cols-4 lg:p-8">
          {DEMO_SCENARIOS.map(item => {
            const isSelected = item.id === selectedScenarioId;
            return (
              <button key={item.id} type="button" aria-pressed={isSelected} onClick={() => setSelectedScenarioId(item.id)} className={`goal-card lift-on-hover group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border text-left ${isSelected ? 'border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-500/15' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'}`}>
                <span className="relative aspect-[16/10] w-full overflow-hidden bg-blue-50">
                  <Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover transition-transform duration-300 motion-reduce:transition-none motion-safe:group-hover:scale-105" />
                </span>
                <span className="flex min-h-24 flex-1 flex-col justify-center px-3 py-3 sm:px-4 sm:py-4">
                  <span className="flex items-center justify-between gap-2 text-sm font-bold leading-snug text-slate-900"><span>{tr(language, item.title)}</span><ArrowRight className={`hidden h-4 w-4 shrink-0 sm:block ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden="true" /></span>
                  <span className="mt-1.5 text-xs leading-relaxed text-slate-500">{tr(language, item.subtitle)}</span>
                </span>
                {isSelected && <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm ring-2 ring-white"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /></span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="sample-results relative flex flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white p-5 text-slate-900 shadow-sm sm:p-8 lg:p-10" aria-live="polite" aria-atomic="true">
          <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-50/60 blur-3xl" />
          <div className="relative flex flex-1 flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-blue-700"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> {tr(language, 'SAMPLE MATCH · ON THIS DEVICE')}</span>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-blue-950">{tr(language, topMatch ? 'A match with a reason.' : 'No listed match yet.')}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{topMatch ? language === 'hi' ? `${tr(language, scenario.title)} के लिए ${localizedTopMatch?.scheme.name} संभावित रूप से ठीक हो सकती है।` : `${tr(language, scenario.title)}: ${localizedTopMatch?.scheme.name} may be a fit.` : tr(language, 'Try another sample or change your answers.')}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 sm:flex-col sm:gap-0.5 sm:px-5 sm:text-center">
                <span className="block text-xs font-medium text-slate-500">{tr(language, 'Possible matches')}</span>
                <span className="block text-3xl font-bold tabular-nums text-blue-700">{matches.length}</span>
              </div>
            </div>

            {topMatch ? (
              <div className="mt-6 grid flex-1 content-center gap-4 lg:grid-cols-[1.05fr_1fr]">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6">
                  <p className="text-xs font-semibold text-blue-700">{tr(language, 'Possible match')}</p>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div><h4 className="text-lg font-bold leading-snug text-blue-950 sm:text-xl">{localizedTopMatch?.scheme.name}</h4><p className="mt-2 text-xs text-slate-600">{tr(language, ROUTE_LABELS[topMatch.scheme.programType ?? 'direct_loan'])}</p></div>
                    <span className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white">{topMatch.matchScore}%</span>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-blue-100" aria-hidden="true"><div className="h-full rounded-full bg-blue-600 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${topMatch.matchScore}%` }} /></div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{tr(language, topMatch.matchReasons[0] ?? topMatch.caveats[0] ?? topMatch.scheme.overview)}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Banknote className="hidden h-4 w-4 text-blue-500 sm:block" aria-hidden="true" />{tr(language, 'Possible support')}</span>
                    <p className="mt-3 text-lg font-bold tracking-tight text-blue-950 sm:text-2xl">{topMatch.recommendedLoanAmount !== undefined ? formatINR(topMatch.recommendedLoanAmount, language) : tr(language, 'See terms')}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{tr(language, 'Final amount may differ')}</p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 sm:p-5">
                    <span className="text-xs font-medium text-slate-500">{tr(language, 'Monthly estimate')}</span>
                    <p className="mt-3 text-lg font-bold tracking-tight text-blue-700 sm:text-2xl">{topMatch.estimatedMonthlyEmi !== undefined ? `${formatINR(topMatch.estimatedMonthlyEmi, language)}${language === 'hi' ? '/महीना' : '/mo'}` : tr(language, 'Terms vary')}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{tr(language, 'Estimate only')}</p>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><p className="text-xs leading-6 text-slate-600">{tr(language, topMatch.caveats.length ? topMatch.caveats[0] : 'Check the final rules with the agency.')}</p></div>
                  </div>
                </div>
              </div>
            ) : <div className="mt-6 flex-1 rounded-2xl border border-blue-100 bg-blue-50/50 p-6 text-sm leading-6 text-slate-600">{tr(language, 'No match in this list yet. Your answers can be changed in Find schemes.')}</div>}

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-6 sm:flex sm:flex-wrap">
              <button type="button" onClick={() => onLoadProfile(scenario.profile)} className="button-motion inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/15 hover:bg-blue-700">{tr(language, 'See all matches')} <ArrowRight className="h-4 w-4 shrink-0" /></button>
              {topMatch?.recommendedLoanAmount !== undefined && <button type="button" onClick={() => { onLoadProfile(scenario.profile); onSelectForCalculator(topMatch); }} className="button-motion inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-blue-800 hover:border-blue-200 hover:bg-blue-50"><Banknote className="h-4 w-4 shrink-0" /> {tr(language, 'Monthly payment')}</button>}
              {topMatch && <button type="button" onClick={() => { onLoadProfile(scenario.profile); onOpenDocuments(topMatch.scheme.id); }} className="button-motion inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-blue-800 hover:border-blue-200 hover:bg-blue-50"><FileCheck2 className="h-4 w-4 shrink-0" /> {tr(language, 'Documents')}</button>}
              {topMatch?.scheme.corporation === 'NSFDC' && <button type="button" onClick={() => { onLoadProfile(scenario.profile); onSelectForLocator(topMatch.scheme.id); }} className="button-motion inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-blue-800 hover:border-blue-200 hover:bg-blue-50"><MapPin className="h-4 w-4 shrink-0" /> {tr(language, 'Find agency')}</button>}
            </div>
          </div>
      </section>

    </div>
  );
}
