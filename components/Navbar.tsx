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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Tiranga Tricolor Line & National Portal Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-white to-emerald-600 border-b border-slate-200" />
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-sky-400">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" /> {tr(language, 'Scheme for your benefit')}
            </span>
            <span className="hidden text-slate-500 sm:inline">|</span>
            <span className="hidden sm:inline">{tr(language, 'Independent scheme planning aid')}</span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline text-slate-400">{tr(language, 'Official sources linked throughout')}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <a 
              href="tel:1800110396" 
              className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors font-medium"
              title={tr(language, 'NSFDC toll-free helpline')}
            >
              <PhoneCall className="w-3 h-3" />
              <span>{tr(language, 'NSFDC Helpline: 1800 11 0396')}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="Scheme Lens"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl object-cover shadow-sm ring-2 ring-sky-400/30 border border-sky-200"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                  Scheme Lens
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                    {tr(language, 'Planning Aid')}
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {tr(language, 'Explore schemes, estimate repayments, and find official application links')}
              </p>
            </div>
          </div>

          {/* Right Controls (Language & Direct CTA) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector */}
            <div className="relative flex items-center gap-1 bg-slate-100 hover:bg-slate-200/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium transition-colors border border-slate-200">
              <Languages className="w-3.5 h-3.5 text-slate-500" />
              <select
                id="language-selector"
                aria-label={tr(language, 'Select language')}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
              >
                {languagesList.map((lang) => (
                  <option key={lang.code} value={lang.code} className="text-slate-900 bg-white">
                    {lang.native} ({lang.label})
                  </option>
                ))}
              </select>
            </div>

            {/* Anti-Fraud Badge */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-sky-900 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>{tr(language, 'Independent tool • Use official channels to apply')}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav aria-label={tr(language, 'Primary navigation')} className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 pt-2">
          <button
            id="tab-showcase"
            type="button"
            onClick={() => setActiveTab('showcase')}
            aria-current={activeTab === 'showcase' ? 'page' : undefined}
            className={`button-motion flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'showcase'
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-sky-800 hover:bg-sky-50'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>{tr(language, 'Lens')}</span>
          </button>

          <button
            id="tab-wizard"
            type="button"
            onClick={() => setActiveTab('wizard')}
            aria-current={activeTab === 'wizard' ? 'page' : undefined}
            className={`button-motion flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'wizard'
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-sky-800 hover:bg-sky-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{tr(language, 'Find schemes')}</span>
          </button>

          <button
            id="tab-calculator"
            type="button"
            onClick={() => setActiveTab('calculator')}
            aria-current={activeTab === 'calculator' ? 'page' : undefined}
            className={`button-motion flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'calculator'
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-sky-800 hover:bg-sky-50'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>{tr(language, 'Calculator')}</span>
          </button>

          <button
            id="tab-locator"
            type="button"
            onClick={() => setActiveTab('locator')}
            aria-current={activeTab === 'locator' ? 'page' : undefined}
            title={tr(language, 'Official Channel Directory')}
            className={`button-motion flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'locator'
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-sky-800 hover:bg-sky-50'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>{tr(language, 'Find agency')}</span>
          </button>

          <button
            id="tab-assistant"
            type="button"
            onClick={() => setActiveTab('assistant')}
            aria-current={activeTab === 'assistant' ? 'page' : undefined}
            className={`button-motion flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'assistant'
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-sky-800 hover:bg-sky-50'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{tr(language, 'Voice Chat')}</span>
          </button>

          <button
            id="tab-documents"
            type="button"
            onClick={() => setActiveTab('documents')}
            aria-current={activeTab === 'documents' ? 'page' : undefined}
            title={tr(language, 'Document Readiness Locker')}
            className={`button-motion flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'documents'
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-sky-800 hover:bg-sky-50'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>{tr(language, 'Documents')}</span>
          </button>

          <button
            id="tab-upload"
            type="button"
            onClick={() => setActiveTab('upload')}
            aria-current={activeTab === 'upload' ? 'page' : undefined}
            title={tr(language, 'Upload private documents and photos')}
            className={`button-motion flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'upload'
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-sky-800 hover:bg-sky-50'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{tr(language, 'Upload')}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
