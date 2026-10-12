'use client';

import React, { useState, useMemo } from 'react';
import { UserProfile, BeneficiaryCategory, ProjectType, SchemeMatchResult } from '@/lib/types';
import { matchSchemes } from '@/lib/rule-engine';
import { VISHWAKARMA_TRADES } from '@/lib/schemes-data';
import { INDIAN_STATES_AND_UTS } from '@/lib/indian-states';
import { displayState, tr } from '@/lib/ui-copy';
import SchemeCard from './SchemeCard';
import SchemeComparison from './SchemeComparison';
import { 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Filter, 
  ShieldCheck,
  UserCheck,
  ArrowLeftRight,
} from 'lucide-react';

interface SchemeWizardProps {
  language: string;
  onSelectForCalculator: (result: SchemeMatchResult) => void;
  onSelectForLocator: (schemeId: string) => void;
  onAskAi: (schemeName: string) => void;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export default function SchemeWizard({
  language,
  onSelectForCalculator,
  onSelectForLocator,
  onAskAi,
  userProfile,
  setUserProfile
}: SchemeWizardProps) {
  const t = (text: string) => tr(language, text);
  const [step, setStep] = useState<number>(1);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [comparedSchemeIds, setComparedSchemeIds] = useState<string[]>([]);

  // Compute matched schemes using rule engine
  const allMatchResults = useMemo(() => matchSchemes(userProfile), [userProfile]);
  const matchResults = useMemo(() => {
    const results = allMatchResults;
    if (selectedCategoryFilter === 'all') return results;
    if (selectedCategoryFilter === 'StreetVendor') return results.filter(result => result.scheme.id === 'pm-svanidhi');
    const filterTypes: Record<string, ProjectType[]> = {
      Nano: ['micro_business'],
      Commercial: ['term_loan_services', 'term_loan_mfg', 'transport_vehicle'],
      Education: ['education_domestic', 'education_abroad'],
      Green: ['green_business'],
      Sanitation: ['sanitation_mech'],
      Artisan: ['traditional_trade'],
    };
    return results.filter(r => filterTypes[selectedCategoryFilter]?.some(type => r.scheme.projectTypes.includes(type)));
  }, [allMatchResults, selectedCategoryFilter]);
  const comparedResults = useMemo(
    () => allMatchResults.filter(result => comparedSchemeIds.includes(result.scheme.id)),
    [allMatchResults, comparedSchemeIds],
  );

  const toggleComparison = (schemeId: string) => {
    setComparedSchemeIds(current => {
      const currentMatches = current.filter(id => allMatchResults.some(result => result.scheme.id === id));
      return currentMatches.includes(schemeId)
        ? currentMatches.filter(id => id !== schemeId)
        : currentMatches.length < 3 ? [...currentMatches, schemeId] : currentMatches;
    });
  };

  // Fictional profiles for trying the matching flow.
  const loadPreset = (presetType: 'nano' | 'women_shg' | 'education' | 'sanitation' | 'green') => {
    setComparedSchemeIds([]);
    if (presetType === 'nano') {
      setUserProfile({
        name: 'Ramesh Kumar',
        category: 'SC',
        categoryProvided: true,
        annualFamilyIncome: 140000,
        incomeProvided: true,
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        projectType: 'micro_business',
        projectTypeProvided: true,
        estimatedCost: 120000,
        ownContribution: 10000,
        hasCasteCertificate: true,
        hasIncomeCertificate: true,
        hasDPR: false,
        hasAdmission: false,
        hasSanitationWorkerEligibility: false,
        age: 28,
        newEnterpriseStatus: 'yes',
        streetVendorStatus: 'yes',
        scStOwnedMseStatus: 'yes',
        projectLocationArea: 'urban',
      });
    } else if (presetType === 'women_shg') {
      setUserProfile({
        name: 'Sunita Devi',
        category: 'SC',
        categoryProvided: true,
        annualFamilyIncome: 180000,
        incomeProvided: true,
        state: 'Maharashtra',
        district: 'Pune',
        projectType: 'micro_business',
        projectTypeProvided: true,
        estimatedCost: 140000,
        ownContribution: 10000,
        hasCasteCertificate: true,
        hasIncomeCertificate: true,
        hasDPR: true,
        hasAdmission: false,
        hasSanitationWorkerEligibility: false,
        age: 34,
        newEnterpriseStatus: 'yes',
        streetVendorStatus: 'unknown',
        scStOwnedMseStatus: 'yes',
        projectLocationArea: 'rural',
      });
    } else if (presetType === 'education') {
      setUserProfile({
        name: 'Amit Anand',
        category: 'SC',
        categoryProvided: true,
        annualFamilyIncome: 320000,
        incomeProvided: true,
        state: 'Delhi',
        district: 'Central Delhi',
        projectType: 'education_abroad',
        projectTypeProvided: true,
        estimatedCost: 2500000,
        ownContribution: 150000,
        hasCasteCertificate: true,
        hasIncomeCertificate: true,
        hasDPR: true,
        hasAdmission: true,
        hasSanitationWorkerEligibility: false,
        age: 22,
      });
    } else if (presetType === 'sanitation') {
      setUserProfile({
        name: 'Vikas Valmiki',
        category: 'SafaiKaramchari',
        categoryProvided: true,
        annualFamilyIncome: 160000,
        incomeProvided: true,
        state: 'Delhi',
        district: 'East Delhi',
        projectType: 'sanitation_mech',
        projectTypeProvided: true,
        estimatedCost: 1500000,
        ownContribution: 50000,
        hasCasteCertificate: true,
        hasIncomeCertificate: true,
        hasDPR: true,
        hasAdmission: false,
        hasSanitationWorkerEligibility: true,
        age: 32,
      });
    } else if (presetType === 'green') {
      setUserProfile({
        name: 'Pooja Bharti',
        category: 'SC',
        categoryProvided: true,
        annualFamilyIncome: 280000,
        incomeProvided: true,
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        projectType: 'green_business',
        projectTypeProvided: true,
        estimatedCost: 1800000,
        ownContribution: 180000,
        hasCasteCertificate: true,
        hasIncomeCertificate: true,
        hasDPR: true,
        hasAdmission: false,
        hasSanitationWorkerEligibility: false,
        age: 30,
        newEnterpriseStatus: 'yes',
        scStOwnedMseStatus: 'yes',
        projectLocationArea: 'urban',
      });
    }
    setStep(3); // jump directly to results
  };

  return (
    <div className="scheme-wizard space-y-6 sm:space-y-7">
      {/* Top Banner with Quick Presets */}
      <div className="wizard-intro soft-arrive rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-white to-sky-50 p-5 text-slate-900 shadow-sm sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr] xl:items-center xl:gap-10">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
                <Sparkles className="w-3.5 h-3.5 text-sky-700" /> {t('Independent planning aid')}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Scheme Lens
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              {t('Add a few details to see possible schemes. This tool does not apply for you or promise a loan or grant.')}
            </p>
          </div>

          {/* Fictional example profiles */}
          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5">
            <span className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-sky-800">
              <UserCheck className="h-4 w-4 text-sky-700" /> {t('Sample profiles')}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                id="preset-nano"
                onClick={() => loadPreset('nano')}
                className="button-motion min-h-10 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
              >
                {t('Kirana shop (₹1.2L)')}
              </button>
              <button
                id="preset-women"
                onClick={() => loadPreset('women_shg')}
                className="button-motion min-h-10 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
              >
                {t('Woman-owned business (₹1.4L)')}
              </button>
              <button
                id="preset-edu"
                onClick={() => loadPreset('education')}
                className="button-motion min-h-10 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
              >
                {t('Study abroad (₹25L)')}
              </button>
              <button
                id="preset-sanitation"
                onClick={() => loadPreset('sanitation')}
                className="button-motion min-h-10 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
              >
                {t('Sanitation equipment (₹15L)')}
              </button>
              <button
                id="preset-green"
                onClick={() => loadPreset('green')}
                className="button-motion min-h-10 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
              >
                {t('Green business example (₹18L)')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step Tabs Navigation */}
      <div className="wizard-step-nav flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-100 bg-white p-2 shadow-sm sm:flex-nowrap sm:p-2.5">
        <div className="grid w-full min-w-0 grid-cols-3 gap-1.5 sm:flex-1 sm:gap-3">
          <button
            id="step-tab-1"
            type="button"
            onClick={() => setStep(1)}
            aria-current={step === 1 ? 'step' : undefined}
            className={`button-motion flex min-h-14 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-xs font-semibold transition-all sm:flex-row sm:gap-3 sm:px-4 sm:text-sm ${
              step === 1 ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:bg-sky-50 hover:text-sky-800'
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step === 1 ? 'bg-white/20' : 'bg-sky-50 text-sky-700'}`}>1</span>
            <span>{t('Profile')}</span>
          </button>
          <button
            id="step-tab-2"
            type="button"
            onClick={() => setStep(2)}
            aria-current={step === 2 ? 'step' : undefined}
            className={`button-motion flex min-h-14 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-xs font-semibold transition-all sm:flex-row sm:gap-3 sm:px-4 sm:text-sm ${
              step === 2 ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:bg-sky-50 hover:text-sky-800'
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step === 2 ? 'bg-white/20' : 'bg-sky-50 text-sky-700'}`}>2</span>
            <span>{t('Project')}</span>
          </button>
          <button
            id="step-tab-3"
            type="button"
            onClick={() => setStep(3)}
            aria-current={step === 3 ? 'step' : undefined}
            className={`button-motion flex min-h-14 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-xs font-semibold transition-all sm:flex-row sm:gap-3 sm:px-4 sm:text-sm ${
              step === 3 ? 'bg-sky-700 text-white shadow-sm' : 'text-slate-600 hover:bg-sky-50 hover:text-sky-800'
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step === 3 ? 'bg-white/20' : 'bg-sky-50 text-sky-700'}`}>3</span>
            <span>{t('Matches')} ({matchResults.length})</span>
          </button>
        </div>

        <button
          onClick={() => {
            setComparedSchemeIds([]);
            setUserProfile({
              name: '',
              category: 'General',
              categoryProvided: false,
              annualFamilyIncome: 0,
              incomeProvided: false,
              state: 'Delhi',
              district: '',
              projectType: 'micro_business',
              projectTypeProvided: false,
              estimatedCost: 0,
              ownContribution: 0,
              hasCasteCertificate: false,
              hasIncomeCertificate: false,
              hasDPR: false,
              hasAdmission: false,
              hasSanitationWorkerEligibility: false,
              age: undefined,
              newEnterpriseStatus: 'unknown',
              streetVendorStatus: 'unknown',
              scStOwnedMseStatus: 'unknown',
              traditionalTrade: undefined,
              hasPreviousTarunRepayment: false,
              projectLocationArea: 'unknown',
              hasEighthGradeEducation: false,
            });
            setStep(1);
          }}
          className="button-motion ml-auto flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-sky-50 hover:text-sky-800 sm:ml-0 sm:border-l sm:border-slate-100 sm:px-4"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('Reset')}</span>
        </button>
      </div>

      {/* Step 1: Personal & Category Profile */}
      {step === 1 && (
        <div className="wizard-panel soft-arrive space-y-7 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="border-b border-slate-100 pb-5">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{t('Step 1: Beneficiary Category & Location')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('Choose your group and where you live to find schemes that may fit.')}</p>
          </div>

          <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2">
            {/* Full Name */}
            <div>
              <label htmlFor="input-name" className="mb-2 block text-sm font-semibold text-slate-700">
                {t('Applicant name')}
              </label>
              <input
                type="text"
                id="input-name"
                value={userProfile.name}
                onChange={(e) => setUserProfile(p => ({ ...p, name: e.target.value }))}
                placeholder={t('e.g. Ramesh Kumar')}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-colors hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100"
              />
            </div>

            {/* Caste / Beneficiary Category */}
            <div>
              <label htmlFor="input-category" className="mb-2 block text-sm font-semibold text-slate-700">
                {t('Beneficiary Category')} <span className="text-sky-600 font-bold">*</span>
              </label>
              <select
                id="input-category"
                value={userProfile.categoryProvided ? userProfile.category : ''}
                onChange={(e) => {
                  const value = e.target.value as BeneficiaryCategory | '';
                  setUserProfile(p => ({ ...p, category: value || 'General', categoryProvided: value !== '' }));
                }}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-colors hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100"
              >
                <option value="">{t('Choose a category')}</option>
                <option value="General">{t('General / other category')}</option>
                <option value="SC">{t('Scheduled Caste (SC)')}</option>
                <option value="ST">{t('Scheduled Tribe (ST)')}</option>
                <option value="OBC">{t('Other Backward Class (OBC)')}</option>
                <option value="SafaiKaramchari">{t('Eligible sanitation worker')}</option>
                <option value="Minority">{t('Notified minority')}</option>
              </select>
            </div>

            {/* State */}
            <div>
              <label htmlFor="input-state" className="mb-2 block text-sm font-semibold text-slate-700">
                {t('State / UT')}
              </label>
              <select
                id="input-state"
                value={userProfile.state}
                onChange={(e) => setUserProfile(p => ({ ...p, state: e.target.value }))}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-colors hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100"
              >
                {INDIAN_STATES_AND_UTS.map(state => <option key={state} value={state}>{displayState(language, state)}</option>)}
              </select>
            </div>

            {/* District */}
            <div>
              <label htmlFor="input-district" className="mb-2 block text-sm font-semibold text-slate-700">
                {t('District or town')}
              </label>
              <input
                type="text"
                id="input-district"
                value={userProfile.district}
                onChange={(e) => setUserProfile(p => ({ ...p, district: e.target.value }))}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-colors hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100"
              />
            </div>
            <div>
              <label htmlFor="input-age" className="mb-2 block text-sm font-semibold text-slate-700">{t('Age (years)')}</label>
              <input
                type="number"
                id="input-age"
                min="0"
                max="120"
                value={userProfile.age ?? ''}
                onChange={(e) => setUserProfile(p => ({ ...p, age: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) }))}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-colors hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100"
              />
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{t('Some schemes have an age rule.')}</p>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              id="next-step-1-btn"
              onClick={() => setStep(2)}
              className="button-motion flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-sky-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-800 sm:w-auto"
            >
              <span>{t('Next: Project costs')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Project & Financial Parameters */}
      {step === 2 && (
        <div className="wizard-panel soft-arrive space-y-7 rounded-3xl border border-sky-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="border-b border-slate-100 pb-5">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{t('Step 2: Project Sector, Income & Cost Estimate')}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('Share your project cost and family income. The agency confirms the final rules.')}</p>
          </div>

          <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Project / Purpose Type */}
            <div className="md:col-span-2">
              <label htmlFor="input-project-type" className="mb-2 block text-sm font-semibold text-slate-700">
                {t('What do you need support for?')} <span className="text-sky-600 font-bold">*</span>
              </label>
              <select
                id="input-project-type"
                value={userProfile.projectType}
                onChange={(e) => setUserProfile(p => ({ ...p, projectType: e.target.value as ProjectType, projectTypeProvided: true }))}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-colors hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100"
              >
                <option value="micro_business">{t('Small business (shop, stall, tailoring)')}</option>
                <option value="term_loan_services">{t('Services (repair, printing, clinic, salon; up to ₹50L)')}</option>
                <option value="term_loan_mfg">{t('Making goods (food processing, metal work, craft; up to ₹50L)')}</option>
                <option value="transport_vehicle">{t('Transport (e-rickshaw, auto, goods vehicle)')}</option>
                <option value="green_business">{t('Green business')}</option>
                <option value="sanitation_mech">{t('Sanitation equipment (suction trucks, jetting machines; up to ₹15L)')}</option>
                <option value="education_domestic">{t('Higher education in India')}</option>
                <option value="education_abroad">{t('Higher education abroad')}</option>
                <option value="traditional_trade">{t('Artisan or craft work')}</option>
              </select>
            </div>

            {/* Estimated Total Project / Study Cost */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="input-cost" className="text-sm font-semibold text-slate-700">
                  {t('Project or course cost')}
                </label>
              <span className="text-xs font-bold text-sky-700 font-mono">
                  ₹{userProfile.estimatedCost.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="number"
                id="input-cost"
                min="0"
                step="1000"
                value={userProfile.estimatedCost}
                onChange={(e) => setUserProfile(p => ({ ...p, estimatedCost: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-colors hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100"
              />
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{t('For study, enter the full fee. NSFDC’s education loan limit is ₹40 lakh or 90% of fees, whichever is lower.')}</p>
            </div>

            {/* Annual Family Income */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="input-income" className="text-sm font-semibold text-slate-700">
                  {t('Annual family income')}
                </label>
                <span className={`text-xs font-bold font-mono ${userProfile.category !== 'SC' ? 'text-slate-700' : userProfile.annualFamilyIncome <= 500000 ? 'text-sky-700' : 'text-blue-900'}`}>
                  ₹{userProfile.annualFamilyIncome.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="number"
                id="input-income"
                min="0"
                step="5000"
                value={userProfile.annualFamilyIncome}
                onChange={(e) => setUserProfile(p => ({ ...p, annualFamilyIncome: Math.max(0, parseInt(e.target.value) || 0), incomeProvided: true }))}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-colors hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100"
              />
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{t('For NSFDC SC loans, family income must be ₹5 lakh or less. Other schemes have different rules.')}</p>
            </div>

            {/* Own Equity / Promoter Contribution */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="input-own-contribution" className="text-sm font-semibold text-slate-700">
                  {t('Your contribution')}
                </label>
                <span className="text-xs font-bold text-slate-700 font-mono">
                  ₹{userProfile.ownContribution.toLocaleString('en-IN')}
                </span>
              </div>
                <input
                  type="number"
                  id="input-own-contribution"
                  min="0"
                  step="500"
                  value={userProfile.ownContribution}
                onChange={(e) => setUserProfile(p => ({ ...p, ownContribution: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs transition-colors hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100"
              />
              <span className="mt-2 block text-xs leading-relaxed text-slate-500">{t('This helps estimate how much of the cost is still left to fund.')}</span>
            </div>
          </div>

          <details className="rounded-2xl border border-sky-100 bg-sky-50/40 p-5">
            <summary className="cursor-pointer text-sm font-semibold text-sky-900">{t('Additional programme checks')} <span className="font-normal text-slate-500">{t('(optional)')}</span></summary>
            <p className="mb-5 mt-3 text-xs leading-relaxed text-slate-500">{t('These answers help find schemes for your work or business. Choose “Not sure” if you don’t know.')}</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium leading-relaxed text-slate-700">{t('Is this a new enterprise?')}
                <select value={userProfile.newEnterpriseStatus ?? 'unknown'} onChange={e => setUserProfile(p => ({ ...p, newEnterpriseStatus: e.target.value as UserProfile['newEnterpriseStatus'] }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100">
                  <option value="unknown">{t('Not sure')}</option><option value="yes">{t('Yes')}</option><option value="no">{t('No, already operating')}</option>
                </select>
              </label>
              <label className="text-sm font-medium leading-relaxed text-slate-700">{t('Street-vendor status')}
                <select value={userProfile.streetVendorStatus ?? 'unknown'} onChange={e => setUserProfile(p => ({ ...p, streetVendorStatus: e.target.value as UserProfile['streetVendorStatus'] }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100">
                  <option value="unknown">{t('Not sure')}</option><option value="yes">{t('Yes')}</option><option value="no">{t('No')}</option>
                </select>
              </label>
              <label className="text-sm font-medium leading-relaxed text-slate-700">{t('Do SC/ST people own more than half of this business?')}
                <select value={userProfile.scStOwnedMseStatus ?? 'unknown'} onChange={e => setUserProfile(p => ({ ...p, scStOwnedMseStatus: e.target.value as UserProfile['scStOwnedMseStatus'] }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100">
                  <option value="unknown">{t('Not sure')}</option><option value="yes">{t('Yes')}</option><option value="no">{t('No')}</option>
                </select>
              </label>
              {userProfile.projectType === 'traditional_trade' && (
                <label className="text-sm font-medium leading-relaxed text-slate-700">{t('Artisan trade')}
                  <select value={userProfile.traditionalTrade ?? ''} onChange={e => setUserProfile(p => ({ ...p, traditionalTrade: e.target.value || undefined }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100">
                    <option value="">{t('Choose a trade')}</option>{VISHWAKARMA_TRADES.map(trade => <option key={trade} value={trade}>{t(trade)}</option>)}
                  </select>
                </label>
              )}
              {userProfile.category === 'SC' || userProfile.category === 'ST' ? (
                <label className="flex min-h-12 cursor-pointer items-center gap-3 self-end rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 transition-colors has-[:checked]:border-sky-300 has-[:checked]:bg-sky-50">
                  <input type="checkbox" checked={Boolean(userProfile.hasPreviousTarunRepayment)} onChange={e => setUserProfile(p => ({ ...p, hasPreviousTarunRepayment: e.target.checked }))} className="h-4 w-4 shrink-0 rounded accent-sky-700 focus:ring-sky-500" />
                  {t('Earlier PMMY Tarun loan paid back in full')}
                </label>
              ) : null}
              <label className="text-sm font-medium leading-relaxed text-slate-700">{t('Project location')}
                <select value={userProfile.projectLocationArea ?? 'unknown'} onChange={e => setUserProfile(p => ({ ...p, projectLocationArea: e.target.value as UserProfile['projectLocationArea'] }))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 hover:border-sky-300 focus:border-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-100">
                  <option value="unknown">{t('Not sure / not applicable')}</option><option value="rural">{t('Rural')}</option><option value="urban">{t('Urban')}</option>
                </select>
              </label>
              {['term_loan_mfg', 'term_loan_services', 'micro_business', 'transport_vehicle', 'green_business', 'traditional_trade'].includes(userProfile.projectType) ? (
                <label className="flex min-h-12 cursor-pointer items-center gap-3 self-end rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 transition-colors has-[:checked]:border-sky-300 has-[:checked]:bg-sky-50">
                  <input type="checkbox" checked={Boolean(userProfile.hasEighthGradeEducation)} onChange={e => setUserProfile(p => ({ ...p, hasEighthGradeEducation: e.target.checked }))} className="h-4 w-4 shrink-0 rounded accent-sky-700 focus:ring-sky-500" />
                  {t('Finished class 8')}
                </label>
              ) : null}
            </div>
          </details>

          {/* Quick Checklist Checkbox Grid */}
          <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-5">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sky-900">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              {t('Document Readiness Quick-Check:')}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 transition-colors hover:border-sky-200 has-[:checked]:border-sky-300 has-[:checked]:bg-sky-50">
                <input
                  type="checkbox"
                  id="chk-caste-cert"
                  checked={userProfile.hasCasteCertificate}
                  onChange={(e) => setUserProfile(p => ({ ...p, hasCasteCertificate: e.target.checked }))}
                  className="h-4 w-4 shrink-0 rounded accent-sky-700 focus:ring-sky-500"
                />
              <span>{t('SC/ST certificate available (where applicable)')}</span>
              </label>

              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 transition-colors hover:border-sky-200 has-[:checked]:border-sky-300 has-[:checked]:bg-sky-50">
                <input
                  type="checkbox"
                  id="chk-income-cert"
                  checked={userProfile.hasIncomeCertificate}
                  onChange={(e) => setUserProfile(p => ({ ...p, hasIncomeCertificate: e.target.checked }))}
                  className="h-4 w-4 shrink-0 rounded accent-sky-700 focus:ring-sky-500"
                />
              <span>{t('Income proof available')}</span>
              </label>
              {userProfile.projectType.startsWith('education_') && (
                <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 transition-colors hover:border-sky-200 has-[:checked]:border-sky-300 has-[:checked]:bg-sky-50">
                  <input
                    type="checkbox"
                    id="chk-admission"
                    checked={Boolean(userProfile.hasAdmission)}
                    onChange={(e) => setUserProfile(p => ({ ...p, hasAdmission: e.target.checked }))}
                    className="h-4 w-4 shrink-0 rounded accent-sky-700 focus:ring-sky-500"
                  />
                <span>{t('Admission confirmed for your course')}</span>
                </label>
              )}
              {userProfile.projectType === 'sanitation_mech' && (
                <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 transition-colors hover:border-sky-200 has-[:checked]:border-sky-300 has-[:checked]:bg-sky-50">
                  <input
                    type="checkbox"
                    id="chk-sanitation-status"
                    checked={Boolean(userProfile.hasSanitationWorkerEligibility)}
                    onChange={(e) => setUserProfile(p => ({ ...p, hasSanitationWorkerEligibility: e.target.checked }))}
                    className="h-4 w-4 shrink-0 rounded accent-sky-700 focus:ring-sky-500"
                  />
                  <span>{t('Sanitation-worker eligibility confirmed')}</span>
                </label>
              )}

              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 transition-colors hover:border-sky-200 has-[:checked]:border-sky-300 has-[:checked]:bg-sky-50">
                <input
                  type="checkbox"
                  id="chk-dpr"
                  checked={userProfile.hasDPR}
                  onChange={(e) => setUserProfile(p => ({ ...p, hasDPR: e.target.checked }))}
                  className="h-4 w-4 shrink-0 rounded accent-sky-700 focus:ring-sky-500"
                />
                <span>{t('Project report or seller’s quote')}</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              onClick={() => setStep(1)}
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800"
            >
              {t('Back')}
            </button>
            <button
              id="match-schemes-btn"
              onClick={() => setStep(3)}
              className="button-motion flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-800 sm:gap-3 sm:px-6"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('See schemes')} ({matchResults.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Real-time Matched Schemes Display */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="soft-arrive flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-700 text-xl font-bold text-white">
                {matchResults.length}
              </div>
              <div>
                  <h3 className="text-base font-bold leading-snug text-slate-900">
                  {t('Possible schemes for')} {userProfile.name || t('you')} ({userProfile.category})
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {t('Income:')} ₹{(userProfile.annualFamilyIncome / 100000).toFixed(2)}L • {t('Est. Cost:')} ₹{(userProfile.estimatedCost / 100000).toFixed(2)}L • {displayState(language, userProfile.state)}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs text-sky-900">
              <ArrowLeftRight className="h-4 w-4 shrink-0 text-sky-700" />
              <span><b>{comparedResults.length}/3</b> {t('picked to compare')}</span>
            </div>

            {/* Quick Category Filters */}
            <div className="flex w-full flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> {t('Filter:')}
              </span>
              {[
                { id: 'all', label: t('All') },
                { id: 'Nano', label: t('Micro / Nano') },
                { id: 'Commercial', label: t('Business loans') },
                { id: 'Education', label: t('Higher Education') },
                { id: 'Green', label: t('Green work') },
                { id: 'Sanitation', label: t('Sanitation') },
                { id: 'StreetVendor', label: t('Street Vendors') },
                { id: 'Artisan', label: t('Craft work') },
              ].map(f => (
                <button
                  key={f.id}
                  id={`filter-${f.id}`}
                  type="button"
                  aria-pressed={selectedCategoryFilter === f.id}
                  onClick={() => setSelectedCategoryFilter(f.id)}
                  className={`min-h-10 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors ${
                    selectedCategoryFilter === f.id
                      ? 'border-sky-700 bg-sky-700 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {comparedResults.length > 0 && (
            <SchemeComparison
              results={comparedResults}
              onRemove={toggleComparison}
              onSelectForCalculator={onSelectForCalculator}
              onSelectForLocator={onSelectForLocator}
              language={language}
            />
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {matchResults.map((result) => (
              <SchemeCard
                key={result.scheme.id}
                result={result}
                language={language}
                onSelectForCalculator={onSelectForCalculator}
                onSelectForLocator={onSelectForLocator}
                onAskAi={onAskAi}
                isCompared={comparedResults.some(compared => compared.scheme.id === result.scheme.id)}
                canCompare={comparedResults.length < 3 || comparedResults.some(compared => compared.scheme.id === result.scheme.id)}
                onToggleCompare={toggleComparison}
              />
            ))}
          </div>

          {matchResults.length === 0 && (
            <div className="rounded-3xl border border-sky-100 bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-700">{t('No match yet. Try changing your answers.')}</p>
              <p className="mt-2 text-xs text-slate-500">
                {!userProfile.categoryProvided || !userProfile.projectTypeProvided || userProfile.estimatedCost <= 0
                  ? t('Choose your group and project, then add the cost.')
                  : t('No match in this list yet. Rules can vary by scheme and location.')}
              </p>
              <div className="mt-3 flex flex-col items-center gap-2">
                <a
                  href="https://socialjustice.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-sky-700 underline"
                >
                  {t('Ministry of Social Justice and Empowerment')}
                </a>
                {selectedCategoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('all')}
                    className="text-xs font-semibold text-sky-600 underline"
                  >
                    {t('Reset Filter')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
