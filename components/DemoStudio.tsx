'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  HandHeart,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile, SchemeMatchResult } from '@/lib/types';
import { matchSchemes } from '@/lib/rule-engine';
import { formatINR } from '@/components/SchemeCard';

interface DemoStudioProps {
  onLoadProfile: (profile: UserProfile) => void;
  onSelectForCalculator: (result: SchemeMatchResult) => void;
  onSelectForLocator: (schemeId: string) => void;
  onOpenDocuments: (schemeId: string) => void;
}

const DEMO_SCENARIOS: {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof BriefcaseBusiness;
  accent: string;
  profile: UserProfile;
}[] = [
  {
    id: 'micro',
    title: 'Kirana shop',
    subtitle: 'Small business · ₹1.2 lakh',
    icon: BriefcaseBusiness,
    accent: 'from-amber-400 to-orange-500',
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
    icon: GraduationCap,
    accent: 'from-blue-400 to-indigo-500',
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
    icon: HandHeart,
    accent: 'from-fuchsia-400 to-rose-500',
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
    icon: ShieldCheck,
    accent: 'from-emerald-400 to-teal-500',
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

export default function DemoStudio({ onLoadProfile, onSelectForCalculator, onSelectForLocator, onOpenDocuments }: DemoStudioProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(DEMO_SCENARIOS[0].id);
  const scenario = DEMO_SCENARIOS.find(item => item.id === selectedScenarioId) ?? DEMO_SCENARIOS[0];
  const matches = useMemo(() => matchSchemes(scenario.profile), [scenario]);
  const topMatch = matches[0];

  return (
    <div className="space-y-4 pb-4">
      <section className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">Pick an example</span>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">Different goals. Different routes.</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Pick a sample to see schemes that may fit.</p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {DEMO_SCENARIOS.map(item => {
              const ScenarioIcon = item.icon;
              const isSelected = item.id === selectedScenarioId;
              return (
                <button key={item.id} type="button" aria-pressed={isSelected} onClick={() => setSelectedScenarioId(item.id)} className={`relative overflow-hidden rounded-2xl border p-3 text-left transition-all ${isSelected ? 'border-sky-400 bg-sky-50 shadow-sm ring-1 ring-sky-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                  <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-sm`}><ScenarioIcon className="h-4 w-4" /></span>
                  <span className="block text-xs font-bold text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-[10px] text-slate-500">{item.subtitle}</span>
                  {isSelected && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-sky-600 ring-4 ring-sky-100" />}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <span className="flex items-center gap-2 text-[11px] text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Sample profile · stays on this page</span>
            <span className="text-[10px] font-bold text-slate-500">No sign-in</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-6">
          <div aria-hidden="true" className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-100 blur-3xl" />
          <div className="relative flex h-full flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> SAMPLE MATCH · ON THIS DEVICE</span>
                <h3 className="mt-3 text-lg font-black">{topMatch ? 'A match with a reason.' : 'No listed match yet.'}</h3>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">{topMatch ? `${scenario.title} may fit ${topMatch.scheme.name}.` : 'Try another sample or change your answers.'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-500">Possible matches</span>
                <span className="mt-0.5 block text-2xl font-black text-slate-900">{matches.length}</span>
              </div>
            </div>

            {topMatch ? (
              <div className="mt-4 grid flex-1 gap-3 sm:grid-cols-[1fr_0.85fr]">
                <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-800">Possible match</p>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div><h4 className="text-sm font-extrabold leading-snug text-slate-900">{topMatch.scheme.name}</h4><p className="mt-1 text-[10px] text-slate-600">{ROUTE_LABELS[topMatch.scheme.programType ?? 'direct_loan']}</p></div>
                    <span className="rounded-lg bg-sky-700 px-2 py-1 text-xs font-black text-white">{topMatch.matchScore}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky-100"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600" style={{ width: `${topMatch.matchScore}%` }} /></div>
                  <p className="mt-3 line-clamp-2 text-[10px] leading-relaxed text-slate-600">{topMatch.matchReasons[0] ?? topMatch.caveats[0] ?? topMatch.scheme.overview}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Possible support</span>
                    <p className="mt-2 text-sm font-black text-slate-900">{topMatch.recommendedLoanAmount !== undefined ? formatINR(topMatch.recommendedLoanAmount) : 'See terms'}</p>
                    <p className="mt-1 text-[9px] text-slate-500">Final amount may differ</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Monthly estimate</span>
                    <p className="mt-2 text-sm font-black text-sky-800">{topMatch.estimatedMonthlyEmi !== undefined ? `${formatINR(topMatch.estimatedMonthlyEmi)}/mo` : 'Terms vary'}</p>
                    <p className="mt-1 text-[9px] text-slate-500">Estimate only</p>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /><p className="text-[10px] font-semibold leading-relaxed text-slate-600">{topMatch.caveats.length ? topMatch.caveats[0] : 'Check the final rules with the agency.'}</p></div>
                  </div>
                </div>
              </div>
            ) : <div className="mt-4 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">No match in this list yet. Your answers can be changed in Find schemes.</div>}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => onLoadProfile(scenario.profile)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-700 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-sky-800">See all matches <ArrowRight className="h-3.5 w-3.5" /></button>
              {topMatch?.recommendedLoanAmount !== undefined && <button type="button" onClick={() => { onLoadProfile(scenario.profile); onSelectForCalculator(topMatch); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Banknote className="h-3.5 w-3.5" /> Monthly payment</button>}
              {topMatch && <button type="button" onClick={() => { onLoadProfile(scenario.profile); onOpenDocuments(topMatch.scheme.id); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><FileCheck2 className="h-3.5 w-3.5" /> Documents</button>}
              {topMatch?.scheme.corporation === 'NSFDC' && <button type="button" onClick={() => { onLoadProfile(scenario.profile); onSelectForLocator(topMatch.scheme.id); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><MapPin className="h-3.5 w-3.5" /> Find agency</button>}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
