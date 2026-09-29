'use client';

import React, { useState, useMemo } from 'react';
import { UserProfile, BeneficiaryCategory, ProjectType, SchemeMatchResult } from '@/lib/types';
import { matchSchemes } from '@/lib/rule-engine';
import { INDIAN_STATES_AND_UTS } from '@/lib/indian-states';
import SchemeCard from './SchemeCard';
import { 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle2, 
  Filter, 
  ShieldCheck,
  UserCheck
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

  // Compute matched schemes using rule engine
  const matchResults = useMemo(() => {
    const results = matchSchemes(userProfile);
    if (selectedCategoryFilter === 'all') return results;
    const filterTypes: Record<string, ProjectType[]> = {
      Nano: ['micro_business'],
      Commercial: ['term_loan_services', 'term_loan_mfg', 'transport_vehicle'],
      Education: ['education_domestic', 'education_abroad'],
      Green: ['green_business'],
      Sanitation: ['sanitation_mech'],
    };
    return results.filter(r => filterTypes[selectedCategoryFilter]?.some(type => r.scheme.projectTypes.includes(type)));
  }, [userProfile, selectedCategoryFilter]);

  // Fictional profiles for trying the matching flow.
  const loadPreset = (presetType: 'nano' | 'women_shg' | 'education' | 'sanitation' | 'green') => {
    if (presetType === 'nano') {
      setUserProfile({
        name: 'Ramesh Kumar',
        category: 'SC',
        annualFamilyIncome: 140000,
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        projectType: 'micro_business',
        estimatedCost: 120000,
        ownContribution: 10000,
        hasCasteCertificate: true,
        hasIncomeCertificate: true,
        hasDPR: false,
        hasAdmission: false,
        hasSanitationWorkerEligibility: false,
      });
    } else if (presetType === 'women_shg') {
      setUserProfile({
        name: 'Sunita Devi',
        category: 'SC',
        annualFamilyIncome: 180000,
        state: 'Maharashtra',
        district: 'Pune',
        projectType: 'micro_business',
        estimatedCost: 140000,
        ownContribution: 10000,
        hasCasteCertificate: true,
        hasIncomeCertificate: true,
        hasDPR: true,
        hasAdmission: false,
        hasSanitationWorkerEligibility: false,
      });
    } else if (presetType === 'education') {
      setUserProfile({
        name: 'Amit Anand',
        category: 'SC',
        annualFamilyIncome: 320000,
        state: 'Delhi',
        district: 'Central Delhi',
        projectType: 'education_abroad',
        estimatedCost: 2500000,
        ownContribution: 150000,
        hasCasteCertificate: true,
        hasIncomeCertificate: true,
        hasDPR: true,
        hasAdmission: true,
        hasSanitationWorkerEligibility: false,
      });
    } else if (presetType === 'sanitation') {
      setUserProfile({
        name: 'Vikas Valmiki',
        category: 'SafaiKaramchari',
        annualFamilyIncome: 160000,
        state: 'Delhi',
        district: 'East Delhi',
        projectType: 'sanitation_mech',
        estimatedCost: 1500000,
        ownContribution: 50000,
        hasCasteCertificate: true,
        hasIncomeCertificate: true,
        hasDPR: true,
        hasAdmission: false,
        hasSanitationWorkerEligibility: true,
      });
    } else if (presetType === 'green') {
      setUserProfile({
        name: 'Pooja Bharti',
        category: 'SC',
        annualFamilyIncome: 280000,
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        projectType: 'green_business',
        estimatedCost: 1800000,
        ownContribution: 180000,
        hasCasteCertificate: true,
        hasIncomeCertificate: true,
        hasDPR: true,
        hasAdmission: false,
        hasSanitationWorkerEligibility: false,
      });
    }
    setStep(3); // jump directly to results
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Presets */}
      <div className="bg-gradient-to-r from-sky-950 via-blue-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-sky-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-200 text-xs font-semibold border border-sky-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-300" /> Independent planning aid
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Smart Scheme Recommender
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Compare a small, source-linked set of schemes against the details you enter. Estimates are preliminary; this tool does not submit applications or promise subsidies.
            </p>
          </div>

          {/* Fictional example profiles */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 shrink-0">
            <span className="text-[11px] font-bold text-amber-300 block mb-2 flex items-center gap-1 uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Fictional examples (replace before using):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                id="preset-nano"
                onClick={() => loadPreset('nano')}
                className="text-xs bg-slate-700 hover:bg-sky-700 text-white px-2.5 py-1 rounded-md transition-colors font-medium border border-slate-600"
              >
                Kirana / Nano (₹1.2L)
              </button>
              <button
                id="preset-women"
                onClick={() => loadPreset('women_shg')}
                className="text-xs bg-slate-700 hover:bg-pink-700 text-white px-2.5 py-1 rounded-md transition-colors font-medium border border-slate-600"
              >
                Women entrepreneur (₹1.4L)
              </button>
              <button
                id="preset-edu"
                onClick={() => loadPreset('education')}
                className="text-xs bg-slate-700 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-md transition-colors font-medium border border-slate-600"
              >
                Education Abroad (₹25L)
              </button>
              <button
                id="preset-sanitation"
                onClick={() => loadPreset('sanitation')}
                className="text-xs bg-slate-700 hover:bg-amber-700 text-white px-2.5 py-1 rounded-md transition-colors font-medium border border-slate-600"
              >
                Sanitation Mech (₹15L)
              </button>
              <button
                id="preset-green"
                onClick={() => loadPreset('green')}
                className="text-xs bg-slate-700 hover:bg-teal-700 text-white px-2.5 py-1 rounded-md transition-colors font-medium border border-slate-600"
              >
                Green business example (₹18L)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step Tabs Navigation */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            id="step-tab-1"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              step === 1 ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">1</span>
            <span>Personal & Category</span>
          </button>
          <button
            id="step-tab-2"
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              step === 2 ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">2</span>
            <span>Project & Financials</span>
          </button>
          <button
            id="step-tab-3"
            onClick={() => setStep(3)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              step === 3 ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">3</span>
            <span>Matched Schemes ({matchResults.length})</span>
          </button>
        </div>

        <button
          onClick={() => {
            setUserProfile({
              name: '',
              category: 'General',
              annualFamilyIncome: 0,
              state: 'Delhi',
              district: '',
              projectType: 'micro_business',
              estimatedCost: 0,
              ownContribution: 0,
              hasCasteCertificate: false,
              hasIncomeCertificate: false,
              hasDPR: false,
              hasAdmission: false,
              hasSanitationWorkerEligibility: false,
            });
            setStep(1);
          }}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Step 1: Personal & Category Profile */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900">Step 1: Beneficiary Category & Location</h3>
            <p className="text-xs text-slate-500">This catalog covers selected NSFDC credit for SC applicants and an NSKFDC sanitation-worker scheme; other groups may have separate schemes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Beneficiary / Applicant Name
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
                value={userProfile.category}
                onChange={(e) => setUserProfile(p => ({ ...p, category: e.target.value as BeneficiaryCategory }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="General">Choose a category</option>
                <option value="SC">Scheduled Caste (SC) — NSFDC schemes</option>
                <option value="SafaiKaramchari">Eligible sanitation worker — NSKFDC scheme</option>
                <option value="OBC">Other Backward Class (not covered by this catalog)</option>
                <option value="ST">Scheduled Tribe (not covered by this catalog)</option>
                <option value="Minority">Notified Minority (not covered by this catalog)</option>
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State / UT (Determines State Channelizing Agency)
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
                District / Town
              </label>
              <input
                type="text"
                id="input-district"
                value={userProfile.district}
                onChange={(e) => setUserProfile(p => ({ ...p, district: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              id="next-step-1-btn"
              onClick={() => setStep(2)}
              className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <span>Next: Project & Financials</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Project & Financial Parameters */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900">Step 2: Project Sector, Income & Cost Estimate</h3>
            <p className="text-xs text-slate-500">We compare your project with published cost and income limits. Any grant or final eligibility must be confirmed by the scheme authority.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Project / Purpose Type */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Intended Project / Purpose Type <span className="text-sky-600 font-bold">*</span>
              </label>
              <select
                id="input-project-type"
                value={userProfile.projectType}
                onChange={(e) => setUserProfile(p => ({ ...p, projectType: e.target.value as ProjectType }))}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="micro_business">Micro Business / Nano Enterprise (vendors, tea stalls, tailoring, petty shops)</option>
                <option value="term_loan_services">Services & Commercial (Auto repair, Printing, Medical clinic, Salon up to ₹50L)</option>
                <option value="term_loan_mfg">Manufacturing & Industrial (Agro-processing, Fabrication, Craft up to ₹50L)</option>
                <option value="transport_vehicle">Commercial Transport (E-Rickshaw, Auto, Small Goods Carrier)</option>
                <option value="green_business">Green or environmentally beneficial business</option>
                <option value="sanitation_mech">Sanitation Mechanization (Suction trucks, Jetting machines up to ₹15L)</option>
                <option value="education_domestic">Eligible higher education in India</option>
                <option value="education_abroad">Eligible higher education abroad</option>
              </select>
            </div>

            {/* Estimated Total Project / Study Cost */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Estimated Total Project Cost
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
              <p className="text-[10px] text-slate-500 mt-1">For education, enter the total course fee. The ELS loan is capped at ₹40 lakh or 90% of fees, whichever is lower.</p>
            </div>

            {/* Annual Family Income */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Annual Family Income {userProfile.category === 'SC' ? '(NSFDC loan ceiling: ₹5,00,000)' : '(as reported)'}
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
                onChange={(e) => setUserProfile(p => ({ ...p, annualFamilyIncome: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">The NSFDC loan ceiling is ₹5 lakh. The NSKFDC sanitation scheme uses different rules; confirm directly.</p>
            </div>

            {/* Own Equity / Promoter Contribution */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Own Contribution / Promoter Equity
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
              <span className="text-[10px] text-slate-500">Funding share varies by scheme and lender. This amount is used only to estimate any remaining project-cost gap.</span>
            </div>
          </div>

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
              <span>SC certificate available</span>
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
                  <span>Admission to an eligible recognized course confirmed</span>
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
                  <span>Eligible sanitation-worker status confirmed</span>
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
                <span>Project Report / Vendor Quotation (DPR)</span>
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
              className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Show Matched Schemes ({matchResults.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Real-time Matched Schemes Display */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                {matchResults.length}
              </div>
              <div>
                  <h3 className="text-sm font-bold text-slate-900">
                  Potential schemes for {userProfile.name || 'Beneficiary'} ({userProfile.category})
                </h3>
                <p className="text-xs text-slate-500">
                  Income: ₹{(userProfile.annualFamilyIncome / 100000).toFixed(2)}L • Est. Cost: ₹{(userProfile.estimatedCost / 100000).toFixed(2)}L • {userProfile.state}
                </p>
              </div>
            </div>

            {/* Quick Category Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {[
                { id: 'all', label: 'All Schemes' },
                { id: 'Nano', label: 'Micro / Nano' },
                { id: 'Commercial', label: 'Term Loans' },
                { id: 'Education', label: 'Higher Education' },
                { id: 'Green', label: 'Green Tech' },
                { id: 'Sanitation', label: 'Sanitation' }
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

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {matchResults.map((result) => (
              <SchemeCard
                key={result.scheme.id}
                result={result}
                onSelectForCalculator={onSelectForCalculator}
                onSelectForLocator={onSelectForLocator}
                onAskAi={onAskAi}
              />
            ))}
          </div>

          {matchResults.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
              <p className="text-sm font-semibold text-slate-700">No listed schemes match these choices.</p>
              <p className="mt-2 text-xs text-slate-500">This catalog currently covers selected NSFDC loans for SC applicants and one NSKFDC sanitation-worker scheme. Check the official directory for other categories or schemes.</p>
              <a href="https://socialjustice.gov.in" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-sky-700 underline">Ministry of Social Justice and Empowerment</a>
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className="mt-2 text-xs font-semibold text-sky-600 underline"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
