'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import SchemeWizard from '@/components/SchemeWizard';
import FinancialCalculator from '@/components/FinancialCalculator';
import PartnerLocatorMap from '@/components/PartnerLocatorMap';
import VoiceAIAssistant from '@/components/VoiceAIAssistant';
import DocumentLocker from '@/components/DocumentLocker';
import UploadDocuments from '@/components/UploadDocuments';
import DemoStudio from '@/components/DemoStudio';
import { UserProfile, SchemeMatchResult } from '@/lib/types';
import { tr } from '@/lib/ui-copy';
import { 
  ExternalLink,
} from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'showcase' | 'wizard' | 'calculator' | 'locator' | 'assistant' | 'documents' | 'upload'>('showcase');
  const [language, setLanguage] = useState<string>('en');

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : language;
  }, [language]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Beneficiary Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
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
    age: undefined,
    newEnterpriseStatus: 'unknown',
    streetVendorStatus: 'unknown',
    scStOwnedMseStatus: 'unknown',
    traditionalTrade: undefined,
    hasPreviousTarunRepayment: false,
    projectLocationArea: 'unknown',
    hasEighthGradeEducation: false,
  });

  // Cross-component coordination
  const [selectedSchemeIdForCalc, setSelectedSchemeIdForCalc] = useState<string>('nsfdc-tls');
  const [selectedSchemeIdForLocator, setSelectedSchemeIdForLocator] = useState<string>('all');
  const [currentAiSchemeName, setCurrentAiSchemeName] = useState<string>('');

  const handleSelectForCalculator = (result: SchemeMatchResult) => {
    setSelectedSchemeIdForCalc(result.scheme.id);
    setActiveTab('calculator');
  };

  const handleSelectForLocator = (schemeId: string) => {
    setSelectedSchemeIdForLocator(schemeId);
    setActiveTab('locator');
  };

  const handleAskAi = (schemeName: string) => {
    setCurrentAiSchemeName(schemeName);
    setActiveTab('assistant');
  };

  const handleLoadDemoProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    setActiveTab('wizard');
  };

  const handleOpenDocuments = (schemeId: string) => {
    setSelectedSchemeIdForCalc(schemeId);
    setActiveTab('documents');
  };

  return (
    <div className="app-shell min-h-screen flex flex-col text-slate-900">
      {/* Navbar with Sticky Tabs */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Main Container */}
      <main className="app-main mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className={activeTab === 'showcase' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
        <DemoStudio
            language={language}
            onGetSchemes={() => setActiveTab('wizard')}
            onLoadProfile={handleLoadDemoProfile}
            onSelectForCalculator={(result) => handleSelectForCalculator(result)}
            onSelectForLocator={handleSelectForLocator}
            onOpenDocuments={handleOpenDocuments}
          />
        </div>

        <div className={activeTab === 'wizard' ? '' : 'hidden'}>
          <SchemeWizard
            language={language}
            onSelectForCalculator={handleSelectForCalculator}
            onSelectForLocator={handleSelectForLocator}
            onAskAi={handleAskAi}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
          />
        </div>

        <div className={activeTab === 'calculator' ? '' : 'hidden'}>
          <FinancialCalculator
            language={language}
            key={`${selectedSchemeIdForCalc}-${userProfile.estimatedCost}-${userProfile.ownContribution}`}
            preselectedSchemeId={selectedSchemeIdForCalc}
            preselectedProjectCost={userProfile.estimatedCost}
            preselectedOwnContribution={userProfile.ownContribution}
            onSelectLocator={handleSelectForLocator}
          />
        </div>

        <div className={activeTab === 'locator' ? '' : 'hidden'}>
          <PartnerLocatorMap
            language={language}
            initialSchemeId={selectedSchemeIdForLocator}
            userState={userProfile.state}
            isActive={activeTab === 'locator'}
          />
        </div>

        <div className={activeTab === 'assistant' ? '' : 'hidden'}>
          <VoiceAIAssistant
            language={language}
            currentSchemeName={currentAiSchemeName}
            userProfile={userProfile}
            isActive={activeTab === 'assistant'}
          />
        </div>

        <div className={activeTab === 'documents' ? '' : 'hidden'}>
          <DocumentLocker
            language={language}
            key={`${selectedSchemeIdForCalc}-${userProfile.hasCasteCertificate}-${userProfile.hasIncomeCertificate}-${userProfile.hasDPR}-${userProfile.hasAdmission}-${userProfile.hasSanitationWorkerEligibility}`}
            userProfile={userProfile}
            selectedSchemeId={selectedSchemeIdForCalc}
          />
        </div>

        <div className={activeTab === 'upload' ? '' : 'hidden'}>
          <UploadDocuments isActive={activeTab === 'upload'} language={language} />
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className={`bg-white text-slate-500 text-xs py-8 border-t border-blue-100 ${activeTab === 'showcase' ? 'mt-0' : 'mt-12'}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 space-y-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-blue-50 pb-5">
            <div className="flex items-center gap-3">
              <Image 
                src="/icon.png" 
                alt="Scheme Lens"
                width={32}
                height={32}
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-blue-100"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="text-blue-950 font-bold text-base">
                  Scheme Lens
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  {tr(language, 'Plan for schemes • Check official sources')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs">
              <a
                href="https://nsfdc.nic.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-blue-800 text-blue-700 flex items-center gap-1.5 transition-colors"
              >
                <span>{tr(language, 'NSFDC Official Portal')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-blue-200">•</span>
              <a
                href="https://socialjustice.gov.in"
                target="_blank"
                rel="noreferrer"
                className="hover:text-blue-800 text-blue-700 flex items-center gap-1.5 transition-colors"
              >
                <span>{tr(language, 'Ministry of Social Justice & Empowerment')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 text-xs leading-6 text-slate-500">
            <p>
              {tr(language, 'This is not a government service. It is not run by NSFDC, NSKFDC, or a ministry.')}
            </p>
            <p>
              {tr(language, 'Ask the scheme agency to confirm rules, rates, papers, and how to apply.')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
