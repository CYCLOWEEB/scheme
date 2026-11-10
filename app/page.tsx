'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import SchemeWizard from '@/components/SchemeWizard';
import FinancialCalculator from '@/components/FinancialCalculator';
import PartnerLocatorMap from '@/components/PartnerLocatorMap';
import SchemeBot from '@/components/SchemeBot';
import DocumentLocker from '@/components/DocumentLocker';
import UploadDocuments from '@/components/UploadDocuments';
import DemoStudio from '@/components/DemoStudio';
import UserProfileCard from '@/components/UserProfileCard';
import FluidExperience from '@/components/FluidExperience';
import { UserProfile, SchemeMatchResult } from '@/lib/types';
import { createEmptyProfile, PROFILE_PHOTO_STORAGE_KEY, PROFILE_STORAGE_KEY, restoreProfile } from '@/lib/profile';
import { tr } from '@/lib/ui-copy';
import { useSectionNavigation } from '@/lib/use-section-navigation';
import { 
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useSectionNavigation();
  const [language, setLanguage] = useState<string>('en');
  const [isBotOpen, setIsBotOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : language;
  }, [language]);

  const [userProfile, setUserProfile] = useState<UserProfile>(createEmptyProfile);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [profileFocusRequest, setProfileFocusRequest] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect -- Restore browser storage after hydration and report storage failures in the UI. */
  useEffect(() => {
    try {
      setUserProfile(restoreProfile(window.localStorage.getItem(PROFILE_STORAGE_KEY)));
      const photo = window.localStorage.getItem(PROFILE_PHOTO_STORAGE_KEY);
      if (photo && photo.length <= 1000000 && /^data:image\/(jpeg|png|webp);base64,/.test(photo)) setProfilePhoto(photo);
    } catch {
      setStorageError(true);
    }
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    if (!profileLoaded) return;
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
      if (profilePhoto) window.localStorage.setItem(PROFILE_PHOTO_STORAGE_KEY, profilePhoto);
      else window.localStorage.removeItem(PROFILE_PHOTO_STORAGE_KEY);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [profileLoaded, userProfile, profilePhoto]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleEditProfile = () => {
    setActiveTab('profile');
    setProfileFocusRequest(current => current + 1);
  };

  // Cross-component coordination
  const [selectedSchemeIdForCalc, setSelectedSchemeIdForCalc] = useState<string>('nsfdc-tls');
  const [calculatorInsightRequest, setCalculatorInsightRequest] = useState(0);
  const [calculatorScenario, setCalculatorScenario] = useState<{ projectCost: number; ownContribution: number } | null>(null);
  const [selectedSchemeIdForLocator, setSelectedSchemeIdForLocator] = useState<string>('all');
  const [currentAiSchemeName, setCurrentAiSchemeName] = useState<string>('');
  const [currentAiSampleProfile, setCurrentAiSampleProfile] = useState<UserProfile | null>(null);

  const handleSelectForCalculator = (result: SchemeMatchResult) => {
    setCalculatorScenario(null);
    setSelectedSchemeIdForCalc(result.scheme.id);
    setActiveTab('calculator');
  };

  const handleSelectForLocator = (schemeId: string) => {
    setSelectedSchemeIdForLocator(schemeId);
    setActiveTab('locator');
  };

  const handleAskAi = (schemeName: string, sampleProfile?: UserProfile) => {
    setCurrentAiSchemeName(schemeName);
    setCurrentAiSampleProfile(sampleProfile ?? null);
    setIsBotOpen(true);
  };

  const handleLoadDemoProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    setActiveTab('wizard');
  };

  const handleOpenDocuments = (schemeId: string) => {
    setCalculatorScenario(null);
    setSelectedSchemeIdForCalc(schemeId);
    setActiveTab('documents');
  };

  const sectionLabels = {
    showcase: 'Lens', wizard: 'Find schemes', calculator: 'Calculator',
    locator: 'Find agency', documents: 'Documents', upload: 'Upload', profile: 'My profile',
  };

  return (
    <FluidExperience activeView={activeTab}>
      <a className="skip-to-content" href="#main-content" onClick={event => {
        event.preventDefault();
        const content = document.getElementById('main-content');
        content?.focus({ preventScroll: true });
        content?.scrollIntoView({ block: 'start', behavior: 'instant' });
      }}>{tr(language, 'Skip to content')}</a>
      <div className="sr-only" role="status" aria-atomic="true">{tr(language, sectionLabels[activeTab])}</div>
      {/* Navbar with Sticky Tabs */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        profileName={userProfile.name}
        profilePhoto={profilePhoto}
        onOpenProfile={handleEditProfile}
      />

      {/* Main Container */}
      <main id="main-content" tabIndex={-1} aria-label={tr(language, sectionLabels[activeTab])} className="app-main app-container flex flex-1 flex-col py-6 sm:py-8 lg:py-6">
        <div id="showcase-view" className={`tab-panel ${activeTab === 'showcase' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}`}>
          <DemoStudio
            language={language}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            onGetSchemes={() => setActiveTab('wizard')}
            onLoadProfile={handleLoadDemoProfile}
            onSelectForCalculator={(result) => handleSelectForCalculator(result)}
            onSelectForLocator={handleSelectForLocator}
            onOpenDocuments={handleOpenDocuments}
            onAskAi={handleAskAi}
            onOpenCalculator={(schemeId, profile) => {
              setSelectedSchemeIdForCalc(schemeId);
              setCalculatorScenario({ projectCost: profile.estimatedCost, ownContribution: profile.ownContribution });
              setCalculatorInsightRequest(current => current + 1);
              setActiveTab('calculator');
            }}
          />
        </div>

        {activeTab === 'profile' && (
          <div id="profile-view" className="tab-panel mx-auto w-full max-w-xl">
            <button
              type="button"
              onClick={() => setActiveTab('showcase')}
              className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {tr(language, 'Back to Lens')}
            </button>
            <UserProfileCard
              language={language}
              profile={userProfile}
              setProfile={setUserProfile}
              photo={profilePhoto}
              setPhoto={setProfilePhoto}
              focusRequest={profileFocusRequest}
              storageError={storageError}
            />
          </div>
        )}

        <div id="wizard-view" className={`tab-panel ${activeTab === 'wizard' ? '' : 'hidden'}`}>
          <SchemeWizard
            language={language}
            onSelectForCalculator={handleSelectForCalculator}
            onSelectForLocator={handleSelectForLocator}
            onAskAi={handleAskAi}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
          />
        </div>

        <div id="calculator-view" className={`tab-panel ${activeTab === 'calculator' ? '' : 'hidden'}`}>
          <FinancialCalculator
            language={language}
            key={`${selectedSchemeIdForCalc}-${calculatorScenario?.projectCost ?? userProfile.estimatedCost}-${calculatorScenario?.ownContribution ?? userProfile.ownContribution}`}
            preselectedSchemeId={selectedSchemeIdForCalc}
            preselectedProjectCost={calculatorScenario?.projectCost ?? userProfile.estimatedCost}
            preselectedOwnContribution={calculatorScenario?.ownContribution ?? userProfile.ownContribution}
            insightRequest={calculatorInsightRequest}
            onSelectLocator={handleSelectForLocator}
          />
        </div>

        <div id="locator-view" className={`tab-panel ${activeTab === 'locator' ? '' : 'hidden'}`}>
          <PartnerLocatorMap
            language={language}
            onAskAi={handleAskAi}
            initialSchemeId={selectedSchemeIdForLocator}
            userState={userProfile.state}
            isActive={activeTab === 'locator'}
          />
        </div>

        <div id="documents-view" className={`tab-panel ${activeTab === 'documents' ? '' : 'hidden'}`}>
          <DocumentLocker
            language={language}
            key={`${selectedSchemeIdForCalc}-${userProfile.hasCasteCertificate}-${userProfile.hasIncomeCertificate}-${userProfile.hasDPR}-${userProfile.hasAdmission}-${userProfile.hasSanitationWorkerEligibility}`}
            userProfile={userProfile}
            selectedSchemeId={selectedSchemeIdForCalc}
          />
        </div>

        <div id="upload-view" className={`tab-panel ${activeTab === 'upload' ? '' : 'hidden'}`}>
          <UploadDocuments isActive={activeTab === 'upload'} language={language} />
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className={`app-footer bg-white text-slate-500 text-xs pb-28 pt-8 border-t border-blue-100 ${activeTab === 'showcase' ? 'mt-0' : 'mt-6'}`}>
        <div className="app-container space-y-5">
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
                <h4 className="text-blue-950 font-bold text-base">Scheme Lens</h4>
                <p className="mt-1 text-xs text-slate-500">{tr(language, 'AI guidance • Official scheme sources')}</p>
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
            <p>{tr(language, 'This is not a government service. It is not run by NSFDC, NSKFDC, or a ministry.')}</p>
            <p>{tr(language, 'Ask the scheme agency to confirm rules, rates, papers, and how to apply.')}</p>
          </div>
        </div>
      </footer>
      <SchemeBot
        language={language}
        currentSchemeName={currentAiSchemeName}
        userProfile={currentAiSampleProfile ?? userProfile}
        isSampleProfile={currentAiSampleProfile !== null}
        isOpen={isBotOpen}
        onOpenChange={setIsBotOpen}
      />
    </FluidExperience>
  );
}
