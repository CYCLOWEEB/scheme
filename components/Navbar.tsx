'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { tr } from '@/lib/ui-copy';
import { useExperienceMotion } from '@/components/FluidExperience';
import { 
  MapPin, 
  Calculator, 
  HandCoins,
  Search,
  FileCheck, 
  PhoneCall, 
  Languages, 
  ShieldCheck,
  Upload,
  Compass,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'showcase' | 'wizard' | 'calculator' | 'locator' | 'documents' | 'upload' | 'profile';
  setActiveTab: (tab: 'showcase' | 'wizard' | 'calculator' | 'locator' | 'documents' | 'upload' | 'profile') => void;
  language: string;
  setLanguage: (lang: string) => void;
  profileName: string;
  profilePhoto: string | null;
  onOpenProfile: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  profileName,
  profilePhoto,
  onOpenProfile
}: NavbarProps) {
  const reduceMotion = useReducedMotion();
  const { paused } = useExperienceMotion();

  const selectTab = (tab: NavbarProps['activeTab']) => {
    if (tab === 'profile') onOpenProfile();
    else setActiveTab(tab);
  };

  const navigationIcon = (tab: NavbarProps['activeTab'], Icon: LucideIcon) => (
    <span
      key={tab}
      aria-hidden="true"
      data-icon-motion={tab}
      className={`navigation-icon${activeTab === tab ? ' navigation-icon-active' : ''}`}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
  const languagesList = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা' }
  ];

  const navigationClass = (tab: NavbarProps['activeTab']) =>
    `navigation-tab relative isolate flex min-h-14 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center text-[11px] font-semibold leading-snug transition-colors sm:text-xs lg:min-h-11 lg:flex-row lg:gap-2 lg:px-3 lg:text-sm ${
      activeTab === tab
        ? 'text-white'
        : 'text-slate-600 hover:bg-white hover:text-blue-700'
    }`;

  const navigationHighlight = (tab: NavbarProps['activeTab']) => activeTab === tab && (
    <motion.span
      aria-hidden="true"
      className="navigation-highlight"
      layoutId={reduceMotion || paused ? undefined : 'primary-navigation-active'}
      initial={false}
      transition={reduceMotion || paused ? { duration: 0 } : { type: 'spring', stiffness: 430, damping: 38 }}
    />
  );

  return (
    <header className="app-header sticky top-0 z-40 border-b border-blue-100 bg-white/95 shadow-[0_6px_24px_-20px_rgba(30,64,175,0.35)] backdrop-blur-xl">
      {/* Portal information */}
      <div className="header-accent h-1 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-sky-300" />
      <div className="header-notice border-b border-blue-100/70 bg-blue-50/80 py-2 text-xs text-slate-600">
        <div className="app-container flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-800">
              <HandCoins className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" /> {tr(language, 'Scheme for your benefit')}
            </span>
            <span className="hidden text-blue-200 sm:inline">|</span>
            <span className="hidden sm:inline">{tr(language, 'AI-powered scheme guidance')}</span>
            <span className="hidden text-blue-200 sm:inline">•</span>
            <span className="hidden text-slate-500 sm:inline">{tr(language, 'Official sources linked throughout')}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <a 
              href="tel:1800110396" 
              className="flex items-center gap-1.5 rounded-sm font-medium text-blue-700 transition-colors hover:text-blue-900"
              title={tr(language, 'NSFDC toll-free helpline')}
            >
              <PhoneCall className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{tr(language, 'NSFDC Helpline: 1800 11 0396')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="app-container pb-3 pt-3.5 lg:pt-4">
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="brand-lockup flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Image
              src="/icon.png"
              alt="Scheme Lens"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-xl border border-blue-100 object-cover shadow-sm ring-4 ring-blue-50 sm:h-11 sm:w-11"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="flex flex-col items-start gap-1 text-lg font-extrabold leading-tight tracking-tight text-blue-950 sm:flex-row sm:items-center sm:gap-2.5 sm:text-xl">
                  Scheme Lens
                  <span className="rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700 sm:px-2 sm:text-[10px]">
                    {tr(language, 'AI powered')}
                  </span>
                </h1>
              </div>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                {tr(language, 'Discover schemes with AI. Compare, plan, and prepare.')}
              </p>
            </div>
          </div>

          {/* Right Controls (Language & Direct CTA) */}
          <div className="header-controls flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Language Selector */}
            <div className="relative flex max-w-36 items-center gap-1.5 rounded-xl border border-blue-100 bg-white px-2 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/50 focus-within:border-blue-400 sm:max-w-none sm:px-3">
              <Languages className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
              <select
                id="language-selector"
                aria-label={tr(language, 'Select language')}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="min-w-0 cursor-pointer bg-transparent pr-1 text-xs font-semibold text-blue-900 outline-none"
              >
                {languagesList.map((lang) => (
                  <option key={lang.code} value={lang.code} className="text-slate-900 bg-white">
                    {lang.native} ({lang.label})
                  </option>
                ))}
              </select>
            </div>

            {/* Anti-Fraud Badge */}
            <div className="hidden max-w-48 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] leading-snug text-blue-900 xl:flex">
              <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
              <span>{tr(language, 'Independent tool • Use official channels to apply')}</span>
            </div>

            <button
              id="tab-profile"
              type="button"
              onClick={() => selectTab('profile')}
              aria-label={tr(language, 'My profile')}
              aria-current={activeTab === 'profile' ? 'page' : undefined}
              aria-controls="profile-view"
              className={`flex min-h-11 items-center gap-2 rounded-xl border p-1.5 text-sm font-semibold sm:pr-3 ${activeTab === 'profile' ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-100' : 'border-blue-100 bg-white text-blue-900 hover:border-blue-300 hover:bg-blue-50'}`}
            >
              <span className={`navigation-icon flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-600${activeTab === 'profile' ? ' navigation-icon-active' : ''}`}>
                {profilePhoto ? <Image src={profilePhoto} alt="" width={32} height={32} unoptimized className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="hidden max-w-28 truncate sm:block" title={profileName || undefined}>{tr(language, 'My profile')}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav aria-label={tr(language, 'Primary navigation')} className="primary-navigation mt-3.5 grid grid-cols-3 gap-1 rounded-2xl border border-blue-100/60 bg-slate-50 p-1.5 sm:grid-cols-6 sm:gap-1.5 lg:mt-4">
          <button
            id="tab-showcase"
            aria-controls="showcase-view"
            type="button"
            onClick={() => selectTab('showcase')}
            aria-current={activeTab === 'showcase' ? 'page' : undefined}
            className={navigationClass('showcase')}
          >
            {navigationHighlight('showcase')}
            {navigationIcon('showcase', Compass)}
            <span>{tr(language, 'Lens')}</span>
          </button>

          <button
            id="tab-wizard"
            aria-controls="wizard-view"
            type="button"
            onClick={() => selectTab('wizard')}
            aria-current={activeTab === 'wizard' ? 'page' : undefined}
            className={navigationClass('wizard')}
          >
            {navigationHighlight('wizard')}
            {navigationIcon('wizard', Search)}
            <span>{tr(language, 'Find schemes')}</span>
          </button>

          <button
            id="tab-calculator"
            aria-controls="calculator-view"
            type="button"
            onClick={() => selectTab('calculator')}
            aria-current={activeTab === 'calculator' ? 'page' : undefined}
            className={navigationClass('calculator')}
          >
            {navigationHighlight('calculator')}
            {navigationIcon('calculator', Calculator)}
            <span>{tr(language, 'Calculator')}</span>
          </button>

          <button
            id="tab-locator"
            aria-controls="locator-view"
            type="button"
            onClick={() => selectTab('locator')}
            aria-current={activeTab === 'locator' ? 'page' : undefined}
            title={tr(language, 'Official Channel Directory')}
            className={navigationClass('locator')}
          >
            {navigationHighlight('locator')}
            {navigationIcon('locator', MapPin)}
            <span>{tr(language, 'Find agency')}</span>
          </button>

          <button
            id="tab-documents"
            aria-controls="documents-view"
            type="button"
            onClick={() => selectTab('documents')}
            aria-current={activeTab === 'documents' ? 'page' : undefined}
            title={tr(language, 'Document Readiness Locker')}
            className={navigationClass('documents')}
          >
            {navigationHighlight('documents')}
            {navigationIcon('documents', FileCheck)}
            <span>{tr(language, 'Documents')}</span>
          </button>

          <button
            id="tab-upload"
            aria-controls="upload-view"
            type="button"
            onClick={() => selectTab('upload')}
            aria-current={activeTab === 'upload' ? 'page' : undefined}
            title={tr(language, 'Upload private documents and photos')}
            className={navigationClass('upload')}
          >
            {navigationHighlight('upload')}
            {navigationIcon('upload', Upload)}
            <span>{tr(language, 'Upload')}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
