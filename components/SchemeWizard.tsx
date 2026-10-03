'use client';

import React, { useState, useMemo } from 'react';
import { UserProfile, BeneficiaryCategory, ProjectType, SchemeMatchResult } from '@/lib/types';
import { matchSchemes } from '@/lib/rule-engine';
import { VISHWAKARMA_TRADES } from '@/lib/schemes-data';
import { INDIAN_STATES_AND_UTS } from '@/lib/indian-states';
import SchemeCard from './SchemeCard';
import SchemeComparison from './SchemeComparison';
import { 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle2, 
  Filter, 
  ShieldCheck,
  UserCheck,
  ArrowLeftRight,
} from 'lucide-react';

interface SchemeWizardProps {
  onSelectForCalculator: (result: SchemeMatchResult) => void;
  onSelectForLocator: (schemeId: string) => void;
  onAskAi: (schemeName: string) => void;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export default function SchemeWizard({
  onSelectForCalculator,
  onSelectForLocator,
  onAskAi,
  userProfile,
  setUserProfile
}: SchemeWizardProps) {
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
    <div className="space-y-6">
      {/* Top Banner with Quick Presets */}
      <div className="soft-arrive bg-gradient-to-r from-sky-50 to-white text-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm border border-sky-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-white text-sky-800 text-xs font-semibold border border-sky-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-700" /> Independent planning aid
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Scheme Lens
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Add a few details to see possible schemes. This tool does not apply for you or promise a loan or grant.
            </p>
          </div>

          {/* Fictional example profiles */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shrink-0">
            <span className="text-[11px] font-bold text-amber-800 block mb-2 flex items-center gap-1 uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-amber-600" /> Sample profiles
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                id="preset-nano"
                onClick={() => loadPreset('nano')}
                className="button-motion min-h-9 text-xs bg-white hover:bg-sky-50 text-slate-700 px-3 py-2 rounded-lg transition-colors font-medium border border-slate-200"
              >
                Kirana shop (₹1.2L)
              </button>
              <button
                id="preset-women"
                onClick={() => loadPreset('women_shg')}
                className="button-motion min-h-9 text-xs bg-white hover:bg-pink-50 text-slate-700 px-3 py-2 rounded-lg transition-colors font-medium border border-slate-200"
              >
                Woman-owned business (₹1.4L)
              </button>
              <button
                id="preset-edu"
                onClick={() => loadPreset('education')}
                className="button-motion min-h-9 text-xs bg-white hover:bg-indigo-50 text-slate-700 px-3 py-2 rounded-lg transition-colors font-medium border border-slate-200"
              >
                Study abroad (₹25L)
              </button>
              <button
                id="preset-sanitation"
                onClick={() => loadPreset('sanitation')}
                className="button-motion min-h-9 text-xs bg-white hover:bg-amber-50 text-slate-700 px-3 py-2 rounded-lg transition-colors font-medium border border-slate-200"
              >
                Sanitation equipment (₹15L)
              </button>
              <button
                id="preset-green"
                onClick={() => loadPreset('green')}
                className="button-motion min-h-9 text-xs bg-white hover:bg-teal-50 text-slate-700 px-3 py-2 rounded-lg transition-colors font-medium border border-slate-200"
              >
                Green business example (₹18L)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step Tabs Navigation */}
      <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            id="step-tab-1"
            type="button"
            onClick={() => setStep(1)}
            aria-current={step === 1 ? 'step' : undefined}
            className={`button-motion flex min-h-10 shrink-0 items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              step === 1 ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">1</span>
            <span>Profile</span>
          </button>
          <button
            id="step-tab-2"
            type="button"
            onClick={() => setStep(2)}
            aria-current={step === 2 ? 'step' : undefined}
            className={`button-motion flex min-h-10 shrink-0 items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              step === 2 ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">2</span>
            <span>Project</span>
          </button>
          <button
            id="step-tab-3"
            type="button"
            onClick={() => setStep(3)}
            aria-current={step === 3 ? 'step' : undefined}
            className={`button-motion flex min-h-10 shrink-0 items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              step === 3 ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">3</span>
            <span>Matches ({matchResults.length})</span>
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
          className="button-motion min-h-10 shrink-0 text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Step 1: Personal & Category Profile */}
      {step === 1 && (
        <div className="soft-arrive bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900">Step 1: Beneficiary Category & Location</h3>
              <p className="text-xs text-slate-500">Choose your group and where you live to find schemes that may fit.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Applicant name
              </label>
              <input
                type="text"
                id="input-name"
                value={userProfile.name}
                onChange={(e) => setUserProfile(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Ramesh Kumar"
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Caste / Beneficiary Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Beneficiary Category <span className="text-sky-600 font-bold">*</span>
              </label>
              <select
                id="input-category"
                value={userProfile.categoryProvided ? userProfile.category : ''}
                onChange={(e) => {
                  const value = e.target.value as BeneficiaryCategory | '';
                  setUserProfile(p => ({ ...p, category: value || 'General', categoryProvided: value !== '' }));
                }}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="">Choose a category</option>
                <option value="General">General / other category</option>
                <option value="SC">Scheduled Caste (SC)</option>
                <option value="ST">Scheduled Tribe (ST)</option>
                <option value="OBC">Other Backward Class (OBC)</option>
                <option value="SafaiKaramchari">Eligible sanitation worker</option>
                <option value="Minority">Notified minority</option>
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State / UT
              </label>
              <select
                id="input-state"
                value={userProfile.state}
                onChange={(e) => setUserProfile(p => ({ ...p, state: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                {INDIAN_STATES_AND_UTS.map(state => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                District or town
              </label>
              <input
                type="text"
                id="input-district"
                value={userProfile.district}
                onChange={(e) => setUserProfile(p => ({ ...p, district: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Age (years)</label>
              <input
                type="number"
                id="input-age"
                min="0"
                max="120"
                value={userProfile.age ?? ''}
                onChange={(e) => setUserProfile(p => ({ ...p, age: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="mt-1 text-[10px] text-slate-500">Some schemes have an age rule.</p>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              id="next-step-1-btn"
              onClick={() => setStep(2)}
              className="button-motion min-h-11 bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <span>Next: Project costs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Project & Financial Parameters */}
      {step === 2 && (
        <div className="soft-arrive bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900">Step 2: Project Sector, Income & Cost Estimate</h3>
            <p className="text-xs text-slate-500">Share your project cost and family income. The agency confirms the final rules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Project / Purpose Type */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                What do you need support for? <span className="text-sky-600 font-bold">*</span>
              </label>
              <select
                id="input-project-type"
                value={userProfile.projectType}
                onChange={(e) => setUserProfile(p => ({ ...p, projectType: e.target.value as ProjectType, projectTypeProvided: true }))}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="micro_business">Small business (shop, stall, tailoring)</option>
                <option value="term_loan_services">Services (repair, printing, clinic, salon; up to ₹50L)</option>
                <option value="term_loan_mfg">Making goods (food processing, metal work, craft; up to ₹50L)</option>
                <option value="transport_vehicle">Transport (e-rickshaw, auto, goods vehicle)</option>
                <option value="green_business">Green business</option>
                <option value="sanitation_mech">Sanitation equipment (suction trucks, jetting machines; up to ₹15L)</option>
                <option value="education_domestic">Higher education in India</option>
                <option value="education_abroad">Higher education abroad</option>
                <option value="traditional_trade">Artisan or craft work</option>
              </select>
            </div>

            {/* Estimated Total Project / Study Cost */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Project or course cost
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
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">For study, enter the full fee. NSFDC’s education loan limit is ₹40 lakh or 90% of fees, whichever is lower.</p>
            </div>

            {/* Annual Family Income */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Annual family income
                </label>
                <span className={`text-xs font-bold font-mono ${userProfile.category !== 'SC' ? 'text-slate-700' : userProfile.annualFamilyIncome <= 500000 ? 'text-sky-700' : 'text-rose-600'}`}>
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
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">For NSFDC SC loans, family income must be ₹5 lakh or less. Other schemes have different rules.</p>
            </div>

            {/* Own Equity / Promoter Contribution */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Your contribution
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
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <span className="text-[10px] text-slate-500">This helps estimate how much of the cost is still left to fund.</span>
            </div>
          </div>

          <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-xs font-bold text-slate-800">Additional programme checks <span className="font-normal text-slate-500">(optional)</span></summary>
            <p className="mb-3 mt-2 text-[10px] text-slate-500">These answers help find schemes for your work or business. Choose “Not sure” if you don’t know.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-medium text-slate-700">Is this a new enterprise?
                <select value={userProfile.newEnterpriseStatus ?? 'unknown'} onChange={e => setUserProfile(p => ({ ...p, newEnterpriseStatus: e.target.value as UserProfile['newEnterpriseStatus'] }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">
                  <option value="unknown">Not sure</option><option value="yes">Yes</option><option value="no">No, already operating</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-700">Street-vendor status
                <select value={userProfile.streetVendorStatus ?? 'unknown'} onChange={e => setUserProfile(p => ({ ...p, streetVendorStatus: e.target.value as UserProfile['streetVendorStatus'] }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">
                  <option value="unknown">Not sure</option><option value="yes">Yes</option><option value="no">No</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-700">Do SC/ST people own more than half of this business?
                <select value={userProfile.scStOwnedMseStatus ?? 'unknown'} onChange={e => setUserProfile(p => ({ ...p, scStOwnedMseStatus: e.target.value as UserProfile['scStOwnedMseStatus'] }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">
                  <option value="unknown">Not sure</option><option value="yes">Yes</option><option value="no">No</option>
                </select>
              </label>
              {userProfile.projectType === 'traditional_trade' && (
                <label className="text-xs font-medium text-slate-700">Artisan trade
                  <select value={userProfile.traditionalTrade ?? ''} onChange={e => setUserProfile(p => ({ ...p, traditionalTrade: e.target.value || undefined }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">
                    <option value="">Choose a trade</option>{VISHWAKARMA_TRADES.map(trade => <option key={trade} value={trade}>{trade}</option>)}
                  </select>
                </label>
              )}
              {userProfile.category === 'SC' || userProfile.category === 'ST' ? (
                <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700">
                  <input type="checkbox" checked={Boolean(userProfile.hasPreviousTarunRepayment)} onChange={e => setUserProfile(p => ({ ...p, hasPreviousTarunRepayment: e.target.checked }))} className="rounded text-sky-600 focus:ring-sky-500" />
                  Earlier PMMY Tarun loan paid back in full
                </label>
              ) : null}
              <label className="text-xs font-medium text-slate-700">Project location
                <select value={userProfile.projectLocationArea ?? 'unknown'} onChange={e => setUserProfile(p => ({ ...p, projectLocationArea: e.target.value as UserProfile['projectLocationArea'] }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs">
                  <option value="unknown">Not sure / not applicable</option><option value="rural">Rural</option><option value="urban">Urban</option>
                </select>
              </label>
              {['term_loan_mfg', 'term_loan_services', 'micro_business', 'transport_vehicle', 'green_business', 'traditional_trade'].includes(userProfile.projectType) ? (
                <label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700">
                  <input type="checkbox" checked={Boolean(userProfile.hasEighthGradeEducation)} onChange={e => setUserProfile(p => ({ ...p, hasEighthGradeEducation: e.target.checked }))} className="rounded text-sky-600 focus:ring-sky-500" />
                  Finished class 8
                </label>
              ) : null}
            </div>
          </details>

          {/* Quick Checklist Checkbox Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              Document Readiness Quick-Check:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  id="chk-caste-cert"
                  checked={userProfile.hasCasteCertificate}
                  onChange={(e) => setUserProfile(p => ({ ...p, hasCasteCertificate: e.target.checked }))}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
              <span>SC/ST certificate available (where applicable)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  id="chk-income-cert"
                  checked={userProfile.hasIncomeCertificate}
                  onChange={(e) => setUserProfile(p => ({ ...p, hasIncomeCertificate: e.target.checked }))}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
              <span>Income proof available</span>
              </label>
              {userProfile.projectType.startsWith('education_') && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="chk-admission"
                    checked={Boolean(userProfile.hasAdmission)}
                    onChange={(e) => setUserProfile(p => ({ ...p, hasAdmission: e.target.checked }))}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                <span>Admission confirmed for your course</span>
                </label>
              )}
              {userProfile.projectType === 'sanitation_mech' && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id="chk-sanitation-status"
                    checked={Boolean(userProfile.hasSanitationWorkerEligibility)}
                    onChange={(e) => setUserProfile(p => ({ ...p, hasSanitationWorkerEligibility: e.target.checked }))}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Sanitation-worker eligibility confirmed</span>
                </label>
              )}

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  id="chk-dpr"
                  checked={userProfile.hasDPR}
                  onChange={(e) => setUserProfile(p => ({ ...p, hasDPR: e.target.checked }))}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Project report or seller’s quote</span>
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(1)}
              className="text-slate-600 hover:text-slate-900 text-sm font-semibold px-4 py-2 rounded-xl border border-slate-200"
            >
              Back
            </button>
            <button
              id="match-schemes-btn"
              onClick={() => setStep(3)}
              className="button-motion min-h-11 bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>See schemes ({matchResults.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Real-time Matched Schemes Display */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="soft-arrive bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                {matchResults.length}
              </div>
              <div>
                  <h3 className="text-sm font-bold text-slate-900">
                  Possible schemes for {userProfile.name || 'you'} ({userProfile.category})
                </h3>
                <p className="text-xs text-slate-500">
                  Income: ₹{(userProfile.annualFamilyIncome / 100000).toFixed(2)}L • Est. Cost: ₹{(userProfile.estimatedCost / 100000).toFixed(2)}L • {userProfile.state}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
              <ArrowLeftRight className="h-4 w-4 shrink-0 text-sky-700" />
              <span><b>{comparedResults.length}/3</b> picked to compare</span>
            </div>

            {/* Quick Category Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {[
                { id: 'all', label: 'All' },
                { id: 'Nano', label: 'Micro / Nano' },
                { id: 'Commercial', label: 'Business loans' },
                { id: 'Education', label: 'Higher Education' },
                { id: 'Green', label: 'Green work' },
                { id: 'Sanitation', label: 'Sanitation' },
                { id: 'StreetVendor', label: 'Street Vendors' },
                { id: 'Artisan', label: 'Craft work' },
              ].map(f => (
                <button
                  key={f.id}
                  id={`filter-${f.id}`}
                  onClick={() => setSelectedCategoryFilter(f.id)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium ${
                    selectedCategoryFilter === f.id
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
            />
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {matchResults.map((result) => (
              <SchemeCard
                key={result.scheme.id}
                result={result}
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
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <p className="text-sm font-semibold text-slate-700">No match yet. Try changing your answers.</p>
              <p className="mt-2 text-xs text-slate-500">
                {!userProfile.categoryProvided || !userProfile.projectTypeProvided || userProfile.estimatedCost <= 0
                  ? 'Choose your group and project, then add the cost.'
                  : 'No match in this list yet. Rules can vary by scheme and location.'}
              </p>
              <div className="mt-3 flex flex-col items-center gap-2">
                <a
                  href="https://socialjustice.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-sky-700 underline"
                >
                  Ministry of Social Justice and Empowerment
                </a>
                {selectedCategoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('all')}
                    className="text-xs font-semibold text-sky-600 underline"
                  >
                    Reset Filter
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
