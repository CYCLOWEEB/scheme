'use client';

import React, { useMemo, useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  AudioLines,
  Banknote,
  CheckCircle2,
  FileCheck2,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile, SchemeMatchResult } from '@/lib/types';
import { getProfileRecommendations, matchSchemes } from '@/lib/rule-engine';
import { isProfileReady } from '@/lib/profile';
import AIInsightPanel from '@/components/AIInsightPanel';
import AnimatedNumber from '@/components/AnimatedNumber';
import CinematicScene from '@/components/CinematicScene';
import RevealText from '@/components/RevealText';
import { useExperienceMotion } from '@/components/FluidExperience';
import { formatLocalizedINR as formatINR, localizeScheme, tr } from '@/lib/ui-copy';
import shopImage from '../images/shop2.0.jpg';
import studentLoanImage from '../images/student_loan.jpeg';
import tailoringImage from '../images/tailor.jpeg';
import sanitationImage from '../images/sanitation.jpeg';

interface DemoStudioProps {
  language: string;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onGetSchemes: () => void;
  onLoadProfile: (profile: UserProfile) => void;
  onSelectForCalculator: (result: SchemeMatchResult) => void;
  onSelectForLocator: (schemeId: string) => void;
  onOpenDocuments: (schemeId: string) => void;
  onAskAi: (schemeName: string, sampleProfile?: UserProfile) => void;
  onOpenCalculator: (schemeId: string, profile: UserProfile) => void;
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

export default function DemoStudio({ language, userProfile, setUserProfile, onGetSchemes, onLoadProfile, onSelectForCalculator, onSelectForLocator, onOpenDocuments, onAskAi, onOpenCalculator }: DemoStudioProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(DEMO_SCENARIOS[0].id);
  const reducedMotion = useReducedMotion();
  const { paused } = useExperienceMotion();
  const personalized = isProfileReady(userProfile);
  const selectedScenario = DEMO_SCENARIOS.find(item => item.id === selectedScenarioId) ?? DEMO_SCENARIOS[0];
  const scenario = personalized && userProfile.projectTypeProvided
    ? DEMO_SCENARIOS.find(item => item.profile.projectType === userProfile.projectType
      || (item.id === 'education' && userProfile.projectType.startsWith('education_')))
      ?? DEMO_SCENARIOS[0]
    : selectedScenario;
  const recommendationProfile = useMemo(() => personalized
    ? { ...userProfile, projectType: userProfile.projectTypeProvided ? userProfile.projectType : scenario.profile.projectType, projectTypeProvided: true }
    : scenario.profile, [personalized, userProfile, scenario]);
  const matches = useMemo(() => matchSchemes(recommendationProfile), [recommendationProfile]);
  const suggestions = useMemo(() => personalized ? getProfileRecommendations(recommendationProfile) : [], [personalized, recommendationProfile]);
  const topMatch = matches[0];
  const topScheme = topMatch?.scheme ?? suggestions[0];
  const localizedTopMatch = topScheme ? { scheme: localizeScheme(topScheme, language) } : undefined;
  const matchCount = matches.length || suggestions.length;
  const resultKey = personalized
    ? `${userProfile.age}-${userProfile.category}-${recommendationProfile.projectType}-${userProfile.estimatedCost}-${userProfile.annualFamilyIncome}`
    : scenario.id;

  const selectScenario = (item: typeof DEMO_SCENARIOS[number]) => {
    setSelectedScenarioId(item.id);
    if (personalized) {
      setUserProfile(current => ({ ...current, projectType: item.profile.projectType, projectTypeProvided: true }));
    }
  };

  return (
    <div className="demo-studio entry-stack flex min-h-0 flex-1 flex-col gap-7">
      <section className="goal-section overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-sm">
        <div className="goal-intro relative flex flex-col justify-between gap-6 overflow-hidden px-5 py-7 sm:px-8 sm:py-9 lg:flex-row lg:items-center lg:px-10">
          <CinematicScene />
          <div className="intro-editorial relative z-10 max-w-2xl">
            <p className="intro-eyebrow"><span aria-hidden="true" />{tr(language, 'AI-powered scheme guidance')}</p>
            <h2 className="intro-title max-w-xl text-[2rem] font-bold leading-[1.2] tracking-tight text-blue-950 sm:text-[2.6rem]"><RevealText text={tr(language, 'Scheme matching powered by AI')} /></h2>
            <p className="intro-copy mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{tr(language, 'Discover possible schemes, then let AI explain your options, repayments, and documents. Ask by text or voice, at every step.')}</p>
          </div>
          <div className="intro-action relative z-10 flex shrink-0 flex-col items-start gap-5 lg:items-center">
            <div className="intro-cta-wrap flex items-center justify-center">
              <button type="button" onClick={onGetSchemes} className="primary-cta button-motion relative isolate inline-flex w-full shrink-0 items-center justify-between gap-5 overflow-hidden whitespace-nowrap">
                <span>{tr(language, 'Get schemes')}</span>
                <span className="primary-cta-arrow" aria-hidden="true"><ArrowRight className="action-arrow h-6 w-6" /></span>
              </button>
            </div>
            <button type="button" onClick={() => onAskAi(topScheme?.name ?? '', personalized ? undefined : recommendationProfile)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-800 hover:border-blue-400 hover:bg-blue-50"><AudioLines className="h-4 w-4" aria-hidden="true" />{tr(language, 'Talk to AI')}</button>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-2 text-xs font-medium text-blue-800"><ShieldCheck className="entry-icon h-4 w-4 text-blue-600" /> {tr(language, personalized ? 'Profile used for recommendations' : 'Sample profile · stays on this page')}</span>
          </div>
        </div>

        <div className="goal-cards grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6 lg:grid-cols-4 lg:p-8">
          {DEMO_SCENARIOS.map(item => {
            const isSelected = item.id === scenario.id;
            return (
              <button key={item.id} type="button" aria-pressed={isSelected} onClick={() => selectScenario(item)} className={`goal-card fluid-card group relative flex min-w-0 flex-col rounded-2xl border text-left ${isSelected ? 'border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-500/15' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'}`}>
                <span className="goal-image-window relative aspect-[16/10] w-full overflow-hidden bg-blue-50">
                  <Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 1024px) 50vw, 25vw" className="goal-image object-cover" />
                </span>
                <span className="flex min-h-24 flex-1 flex-col justify-center px-3 py-3 sm:px-4 sm:py-4">
                  <span className="flex items-center justify-between gap-2 text-sm font-bold leading-snug text-slate-900"><span>{tr(language, item.title)}</span><ArrowRight className={`hidden h-4 w-4 shrink-0 sm:block ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} aria-hidden="true" /></span>
                  <span className="mt-1.5 text-xs leading-relaxed text-slate-500">{tr(language, item.subtitle)}</span>
                </span>
                {isSelected && <motion.span layoutId={reducedMotion || paused ? undefined : 'selected-goal'} transition={reducedMotion || paused ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 30 }} className="goal-selection absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm ring-2 ring-white"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /></motion.span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="sample-results relative flex flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white p-5 text-slate-900 shadow-sm sm:p-8 lg:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-50/60 blur-3xl" />
          <div className="relative flex flex-1 flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-[700] tracking-tight text-blue-950">{tr(language, 'Your matches, explained with AI')}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{topScheme ? language === 'hi' ? `${personalized ? userProfile.name || 'आप' : tr(language, scenario.title)} के लिए ${localizedTopMatch?.scheme.name} संभावित रूप से ठीक हो सकती है।` : `${personalized ? userProfile.name || 'Your profile' : tr(language, scenario.title)}: ${localizedTopMatch?.scheme.name} may be a fit.` : tr(language, personalized ? 'Try another goal or edit your profile to explore other options.' : 'Try another sample or change your answers.')}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 sm:flex-col sm:gap-0.5 sm:px-5 sm:text-center">
                <span className="block text-xs font-medium text-slate-500">{tr(language, 'Possible matches')}</span>
                <AnimatedNumber value={matchCount} className="match-count block text-3xl font-bold tabular-nums text-blue-700" />
              </div>
            </div>

            {topScheme ? (
              <div key={resultKey} className="sample-match-content mt-6 grid flex-1 content-center gap-4 lg:grid-cols-[1.05fr_1fr]">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6">
                  <p className="text-xs font-semibold text-blue-700">{tr(language, 'Possible match')}</p>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div><h4 className="text-lg font-bold leading-snug text-blue-950 sm:text-xl">{localizedTopMatch?.scheme.name}</h4><p className="mt-2 text-xs text-slate-600">{tr(language, ROUTE_LABELS[topScheme.programType ?? 'direct_loan'])}</p></div>
                    <span className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white">{topMatch ? `${topMatch.matchScore}%` : tr(language, 'Explore')}</span>
                  </div>
                  {topMatch && <div className="mt-5 h-2 overflow-hidden rounded-full bg-blue-100" aria-hidden="true"><div className="match-progress h-full rounded-full bg-blue-600" style={{ width: `${topMatch.matchScore}%` }} /></div>}
                  <p className="mt-4 text-sm leading-6 text-slate-600">{tr(language, topMatch?.matchReasons[0] ?? topMatch?.caveats[0] ?? 'Supports your selected goal and beneficiary category.')}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><Banknote className="hidden h-4 w-4 text-blue-500 sm:block" aria-hidden="true" />{tr(language, 'Possible support')}</span>
                    <p className="mt-3 text-lg font-bold tracking-tight text-blue-950 sm:text-2xl">{topMatch?.recommendedLoanAmount !== undefined ? <AnimatedNumber value={topMatch.recommendedLoanAmount} format={value => formatINR(value, language)} /> : tr(language, 'See terms')}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{tr(language, 'Final amount may differ')}</p>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 sm:p-5">
                    <span className="text-xs font-medium text-slate-500">{tr(language, 'Monthly estimate')}</span>
                    <p className="mt-3 text-lg font-bold tracking-tight text-blue-700 sm:text-2xl">{topMatch?.estimatedMonthlyEmi !== undefined ? <AnimatedNumber value={topMatch.estimatedMonthlyEmi} format={value => `${formatINR(value, language)}${language === 'hi' ? '/महीना' : '/mo'}`} /> : tr(language, 'Terms vary')}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{tr(language, 'Estimate only')}</p>
                    {topMatch?.estimatedMonthlyEmi !== undefined && <button type="button" onClick={() => onOpenCalculator(topMatch.scheme.id, recommendationProfile)} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-xs font-semibold text-blue-700 hover:text-blue-900">{tr(language, 'Explain with AI')}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>}
                  </div>
                  <div className="col-span-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><p className="text-xs leading-6 text-slate-600">{tr(language, topMatch?.caveats[0] ?? (personalized ? 'Suggestions are preliminary. Income, documents and other scheme conditions still need verification.' : 'Check the final rules with the agency.'))}</p></div>
                  </div>
                </div>
              </div>
            ) : <div className="mt-6 flex-1 rounded-2xl border border-blue-100 bg-blue-50/50 p-6 text-sm leading-6 text-slate-600">{tr(language, 'No match in this list yet. Your answers can be changed in Find schemes.')}</div>}

            <div className="mt-5"><AIInsightPanel tool="recommendations" language={language} profile={recommendationProfile} schemeIds={matches.slice(0, 3).map(result => result.scheme.id)} compact /></div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-6 sm:flex sm:flex-wrap">
              <button type="button" onClick={() => onLoadProfile(recommendationProfile)} className="button-motion inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/15 hover:bg-blue-700">{tr(language, 'See all matches')} <ArrowRight className="action-arrow h-4 w-4 shrink-0" /></button>
              {topMatch?.recommendedLoanAmount !== undefined && <button type="button" onClick={() => { onLoadProfile(recommendationProfile); onSelectForCalculator(topMatch); }} className="button-motion inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-blue-800 hover:border-blue-200 hover:bg-blue-50"><Banknote className="h-4 w-4 shrink-0" /> {tr(language, 'Monthly payment')}</button>}
              {topScheme && <button type="button" onClick={() => { onLoadProfile(recommendationProfile); onOpenDocuments(topScheme.id); }} className="button-motion inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-blue-800 hover:border-blue-200 hover:bg-blue-50"><FileCheck2 className="h-4 w-4 shrink-0" /> {tr(language, 'Documents')}</button>}
              {topScheme?.corporation === 'NSFDC' && <button type="button" onClick={() => { onLoadProfile(recommendationProfile); onSelectForLocator(topScheme.id); }} className="button-motion inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-blue-800 hover:border-blue-200 hover:bg-blue-50"><MapPin className="h-4 w-4 shrink-0" /> {tr(language, 'Find agency')}</button>}
            </div>
          </div>
      </section>

    </div>
  );
}
