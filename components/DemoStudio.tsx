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

export default function DemoStudio({ language, onLoadProfile, onSelectForCalculator, onSelectForLocator, onOpenDocuments }: DemoStudioProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(DEMO_SCENARIOS[0].id);
  const scenario = DEMO_SCENARIOS.find(item => item.id === selectedScenarioId) ?? DEMO_SCENARIOS[0];
  const matches = useMemo(() => matchSchemes(scenario.profile), [scenario]);
  const topMatch = matches[0];
  const localizedTopMatch = topMatch ? { ...topMatch, scheme: localizeScheme(topMatch.scheme, language) } : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">{tr(language, 'Start here · No sign-in')}</span>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">{tr(language, 'A simpler path to loan options.')}</h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">{tr(language, 'Choose a goal to explore schemes that may fit, estimated payments, and where to apply. Apna raasta yahin se shuru karein.')}</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-600" /> {tr(language, 'Sample profile · stays on this page')}</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DEMO_SCENARIOS.map(item => {
            const isSelected = item.id === selectedScenarioId;
            return (
              <button key={item.id} type="button" aria-pressed={isSelected} onClick={() => setSelectedScenarioId(item.id)} className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border text-left transition-all ${isSelected ? 'border-sky-400 bg-sky-50 shadow-sm ring-1 ring-sky-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                <span className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  <Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                </span>
                <span className="flex min-h-[4.25rem] flex-col justify-center px-3 py-2.5 pr-8">
                  <span className="text-xs font-bold text-slate-900">{tr(language, item.title)}</span>
                  <span className="mt-1 text-[10px] leading-relaxed text-slate-500">{tr(language, item.subtitle)}</span>
                </span>
                {isSelected && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-sky-600 ring-4 ring-white/90" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="relative flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-6">
          <div aria-hidden="true" className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-100 blur-3xl" />
          <div className="relative flex flex-1 flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {tr(language, 'SAMPLE MATCH · ON THIS DEVICE')}</span>
                <h3 className="mt-3 text-lg font-black">{tr(language, topMatch ? 'A match with a reason.' : 'No listed match yet.')}</h3>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">{topMatch ? `${tr(language, scenario.title)} के लिए ${localizedTopMatch?.scheme.name} संभावित रूप से ठीक हो सकती है।` : tr(language, 'Try another sample or change your answers.')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-500">{tr(language, 'Possible matches')}</span>
                <span className="mt-0.5 block text-2xl font-black text-slate-900">{matches.length}</span>
              </div>
            </div>

            {topMatch ? (
              <div className="mt-4 grid flex-1 content-center gap-3 lg:grid-cols-[1.05fr_1fr]">
                <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-800">{tr(language, 'Possible match')}</p>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div><h4 className="text-sm font-extrabold leading-snug text-slate-900">{localizedTopMatch?.scheme.name}</h4><p className="mt-1 text-[10px] text-slate-600">{tr(language, ROUTE_LABELS[topMatch.scheme.programType ?? 'direct_loan'])}</p></div>
                    <span className="rounded-lg bg-sky-700 px-2 py-1 text-xs font-black text-white">{topMatch.matchScore}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky-100"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600" style={{ width: `${topMatch.matchScore}%` }} /></div>
                  <p className="mt-3 line-clamp-2 text-[10px] leading-relaxed text-slate-600">{tr(language, topMatch.matchReasons[0] ?? topMatch.caveats[0] ?? topMatch.scheme.overview)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{tr(language, 'Possible support')}</span>
                    <p className="mt-2 text-sm font-black text-slate-900">{topMatch.recommendedLoanAmount !== undefined ? formatINR(topMatch.recommendedLoanAmount, language) : tr(language, 'See terms')}</p>
                    <p className="mt-1 text-[9px] text-slate-500">{tr(language, 'Final amount may differ')}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{tr(language, 'Monthly estimate')}</span>
                    <p className="mt-2 text-sm font-black text-sky-800">{topMatch.estimatedMonthlyEmi !== undefined ? `${formatINR(topMatch.estimatedMonthlyEmi, language)}${language === 'hi' ? '/महीना' : '/mo'}` : tr(language, 'Terms vary')}</p>
                    <p className="mt-1 text-[9px] text-slate-500">{tr(language, 'Estimate only')}</p>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /><p className="text-[10px] font-semibold leading-relaxed text-slate-600">{tr(language, topMatch.caveats.length ? topMatch.caveats[0] : 'Check the final rules with the agency.')}</p></div>
                  </div>
                </div>
              </div>
            ) : <div className="mt-4 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">{tr(language, 'No match in this list yet. Your answers can be changed in Find schemes.')}</div>}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => onLoadProfile(scenario.profile)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-700 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-sky-800">{tr(language, 'See all matches')} <ArrowRight className="h-3.5 w-3.5" /></button>
              {topMatch?.recommendedLoanAmount !== undefined && <button type="button" onClick={() => { onLoadProfile(scenario.profile); onSelectForCalculator(topMatch); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Banknote className="h-3.5 w-3.5" /> {tr(language, 'Monthly payment')}</button>}
              {topMatch && <button type="button" onClick={() => { onLoadProfile(scenario.profile); onOpenDocuments(topMatch.scheme.id); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><FileCheck2 className="h-3.5 w-3.5" /> {tr(language, 'Documents')}</button>}
              {topMatch?.scheme.corporation === 'NSFDC' && <button type="button" onClick={() => { onLoadProfile(scenario.profile); onSelectForLocator(topMatch.scheme.id); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><MapPin className="h-3.5 w-3.5" /> {tr(language, 'Find agency')}</button>}
            </div>
          </div>
      </section>

    </div>
  );
}
