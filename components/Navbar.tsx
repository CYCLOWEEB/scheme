'use client';

import React from 'react';
import Image from 'next/image';
import { tr } from '@/lib/ui-copy';
import { 
  MapPin, 
  Calculator, 
  Sparkles, 
  FileCheck, 
  PhoneCall, 
  Languages, 
  ShieldCheck,
  MessageCircle,
  Upload,
  Compass,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'showcase' | 'wizard' | 'calculator' | 'locator' | 'assistant' | 'documents' | 'upload';
  setActiveTab: (tab: 'showcase' | 'wizard' | 'calculator' | 'locator' | 'assistant' | 'documents' | 'upload') => void;
  language: string;
  setLanguage: (lang: string) => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  language,
  setLanguage
}: NavbarProps) {
  const languagesList = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা' }
  ];

  const navigationClass = (tab: NavbarProps['activeTab']) =>
    `button-motion flex min-h-14 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center text-[11px] font-semibold leading-snug transition-all sm:text-xs lg:min-h-11 lg:flex-row lg:gap-2 lg:px-3 lg:text-sm ${
      activeTab === tab
        ? 'bg-blue-600 text-white shadow-[0_4px_12px_-4px_rgba(37,99,235,0.55)]'
        : 'text-slate-600 hover:bg-white hover:text-blue-700'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/95 shadow-[0_6px_24px_-20px_rgba(30,64,175,0.35)] backdrop-blur-xl">
      {/* Portal information */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-sky-300" />
      <div className="border-b border-blue-100/70 bg-blue-50/80 px-4 py-2 text-xs text-slate-600 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-800">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" /> {tr(language, 'Scheme for your benefit')}
            </span>
            <span className="hidden text-blue-200 sm:inline">|</span>
            <span className="hidden sm:inline">{tr(language, 'Independent scheme planning aid')}</span>
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
      <div className="mx-auto max-w-7xl px-4 pb-3 pt-3.5 sm:px-6 lg:px-8 lg:pt-4">
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo & Name */}
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
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
                    {tr(language, 'Planning Aid')}
                  </span>
                </h1>
              </div>
              <p className="mt-1 hidden text-xs text-slate-500 sm:block">
                {tr(language, 'Explore schemes, estimate repayments, and find official application links')}
              </p>
            </div>
          </div>

          {/* Right Controls (Language & Direct CTA) */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav aria-label={tr(language, 'Primary navigation')} className="mt-3.5 grid grid-cols-4 gap-1 rounded-2xl border border-blue-100/60 bg-slate-50 p-1.5 sm:grid-cols-7 sm:gap-1.5 lg:mt-4">
          <button
            id="tab-showcase"
            type="button"
            onClick={() => setActiveTab('showcase')}
            aria-current={activeTab === 'showcase' ? 'page' : undefined}
            className={navigationClass('showcase')}
          >
            <Compass className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{tr(language, 'Lens')}</span>
          </button>

          <button
            id="tab-wizard"
            type="button"
            onClick={() => setActiveTab('wizard')}
            aria-current={activeTab === 'wizard' ? 'page' : undefined}
            className={navigationClass('wizard')}
          >
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{tr(language, 'Find schemes')}</span>
          </button>

          <button
            id="tab-calculator"
            type="button"
            onClick={() => setActiveTab('calculator')}
            aria-current={activeTab === 'calculator' ? 'page' : undefined}
            className={navigationClass('calculator')}
          >
            <Calculator className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{tr(language, 'Calculator')}</span>
          </button>

          <button
            id="tab-locator"
            type="button"
            onClick={() => setActiveTab('locator')}
            aria-current={activeTab === 'locator' ? 'page' : undefined}
            title={tr(language, 'Official Channel Directory')}
            className={navigationClass('locator')}
          >
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{tr(language, 'Find agency')}</span>
          </button>

          <button
            id="tab-assistant"
            type="button"
            onClick={() => setActiveTab('assistant')}
            aria-current={activeTab === 'assistant' ? 'page' : undefined}
            className={navigationClass('assistant')}
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{tr(language, 'Voice Chat')}</span>
          </button>

          <button
            id="tab-documents"
            type="button"
            onClick={() => setActiveTab('documents')}
            aria-current={activeTab === 'documents' ? 'page' : undefined}
            title={tr(language, 'Document Readiness Locker')}
            className={navigationClass('documents')}
          >
            <FileCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{tr(language, 'Documents')}</span>
          </button>

          <button
            id="tab-upload"
            type="button"
            onClick={() => setActiveTab('upload')}
            aria-current={activeTab === 'upload' ? 'page' : undefined}
            title={tr(language, 'Upload private documents and photos')}
            className={navigationClass('upload')}
          >
            <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{tr(language, 'Upload')}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
