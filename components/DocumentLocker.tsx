'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, ExternalLink, FileText, Printer, ShieldCheck } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { SCHEMES_DATABASE } from '@/lib/schemes-data';
import { displayState, localizeScheme, tr } from '@/lib/ui-copy';

interface DocumentLockerProps {
  language: string;
  userProfile: UserProfile;
  selectedSchemeId?: string;
}

function isReadyFromProfile(document: string, profile: UserProfile): boolean {
  const label = document.toLowerCase();
  if (label.includes('sc certificate')) return profile.hasCasteCertificate;
  if (label.includes('income proof')) return profile.hasIncomeCertificate;
  if (label.includes('admission')) return Boolean(profile.hasAdmission);
  if (label.includes('sanitation-worker')) return Boolean(profile.hasSanitationWorkerEligibility);
  if (label.includes('street-vendor') || label.includes('vendor identity')) return profile.streetVendorStatus === 'yes';
  if (label.includes('sc/st ownership') || label.includes('enterprise ownership')) return profile.scStOwnedMseStatus === 'yes';
  if (label.includes('trade and occupation')) return Boolean(profile.traditionalTrade);
  if (label.includes('project report') || label.includes('quotation') || label.includes('estimate')) return profile.hasDPR;
  return false;
}

export default function DocumentLocker({ language, userProfile, selectedSchemeId = 'nsfdc-tls' }: DocumentLockerProps) {
  const t = (text: string) => tr(language, text);
  const [currentSchemeId, setCurrentSchemeId] = useState(selectedSchemeId);
  const scheme = SCHEMES_DATABASE.find(item => item.id === currentSchemeId) ?? SCHEMES_DATABASE[0];
  const displayScheme = localizeScheme(scheme, language);
  const requirements = scheme.mandatoryDocuments;
  const [ready, setReady] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(requirements.map((document, index) => [`${index}-${document}`, isReadyFromProfile(document, userProfile)])),
  );
  const [dateLabel, setDateLabel] = useState('');
  const readyCount = requirements.filter((document, index) => ready[`${index}-${document}`]).length;
  const readinessPercent = requirements.length ? Math.round((readyCount / requirements.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800">
              <ShieldCheck className="h-3.5 w-3.5" /> {t('Personal document checklist')}
            </span>
            <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{t('Prepare for an application')}</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">{t('Tick the papers you have. This list stays while the page is open. No files are saved or checked here.')}</p>
          </div>
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 md:max-w-xs">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>{t('Your checklist')}</span><span className="text-sky-700">{readinessPercent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-sky-600 transition-all" style={{ width: `${readinessPercent}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{t(`${readyCount} of ${requirements.length} papers ready`)}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{t('Checklist for')} {displayScheme.name}</h3>
            <span className="text-[11px] text-slate-500">{t('Ask the agency for its latest list.')}</span>
          </div>
          <div className="sm:min-w-72">
          <label htmlFor="document-scheme-select" className="mb-1 block text-[11px] font-bold text-slate-600">{t('Choose a scheme')}</label>
            <select id="document-scheme-select" value={currentSchemeId} onChange={event => {
              const nextSchemeId = event.target.value;
              const nextScheme = SCHEMES_DATABASE.find(item => item.id === nextSchemeId);
              if (!nextScheme) return;
              setCurrentSchemeId(nextSchemeId);
              setReady(Object.fromEntries(nextScheme.mandatoryDocuments.map((document, index) => [`${index}-${document}`, isReadyFromProfile(document, userProfile)])));
            }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500">
              {SCHEMES_DATABASE.map(item => <option key={item.id} value={item.id}>{localizeScheme(item, language).name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {requirements.map((document, index) => {
            const id = `${index}-${document}`;
            const isReady = Boolean(ready[id]);
            return (
              <label key={id} htmlFor={`document-${index}`} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-sky-300">
                <input
                  id={`document-${index}`}
                  type="checkbox"
                  checked={isReady}
                  onChange={event => setReady(current => ({ ...current, [id]: event.target.checked }))}
                  className="sr-only"
                />
                {isReady ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />}
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{t(document)}</span>
                  <span className="mt-1 block text-xs text-slate-500">{isReady ? t('You have this') : t('Still needed')}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-sky-50 p-5 text-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-sky-800"><FileText className="h-3.5 w-3.5" /> {t('Print-friendly preparation sheet')}</p>
          <h3 className="mt-1 text-lg font-bold">{t('Review your details before visiting or applying online')}</h3>
          <p className="mt-1 text-xs text-slate-600">{t('This is your checklist, not a government form or application.')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDateLabel(new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN'));
            window.setTimeout(() => window.print(), 0);
          }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800"
        >
          <Printer className="h-4 w-4" /> {t('Print or save as PDF')}
        </button>
      </section>

      <section id="print-dossier" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-800">{t('Independent planning aid · Not an official form')}</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">{t('Scheme application preparation sheet')}</h3>
          <p className="mt-1 text-xs text-slate-500">{t('Prepared')} {dateLabel} · {t('No application has been sent or saved.')}</p>
        </div>

        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('Applicant details entered')}</h4>
            <p><b>{t('Name:')}</b> {userProfile.name || t('Not entered')}</p>
            <p><b>{t('Category:')}</b> {t(userProfile.category)}</p>
            <p><b>{t('Annual family income:')}</b> ₹{userProfile.annualFamilyIncome.toLocaleString('en-IN')}</p>
            <p><b>{t('State / UT:')}</b> {displayState(language, userProfile.state)}</p>
            <p><b>{t('District:')}</b> {userProfile.district || t('Not entered')}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('Scheme estimate')}</h4>
            <p><b>{t('Scheme:')}</b> {displayScheme.name}</p>
            <p><b>{t('Project / course cost:')}</b> ₹{userProfile.estimatedCost.toLocaleString('en-IN')}</p>
            <p><b>{t('Own contribution entered:')}</b> ₹{userProfile.ownContribution.toLocaleString('en-IN')}</p>
            <p><b>{t('Support type:')}</b> {t(scheme.programType?.replaceAll('_', ' ') ?? 'direct loan')}</p>
            {scheme.concessionalInterestRate !== undefined && <p><b>{t('Published rate:')}</b> {scheme.interestRateLabel ?? `${scheme.concessionalInterestRate}%`} {t('per year')}</p>}
            {scheme.maxLoanAmount !== undefined && <p><b>{t('Maximum listed loan:')}</b> ₹{scheme.maxLoanAmount.toLocaleString('en-IN')}</p>}
            {displayScheme.financialHighlights?.map(item => <p key={item.label}><b>{item.label}:</b> {item.value}</p>)}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('Documents marked available')}</h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {requirements.map((document, index) => (
              <li key={`${index}-${document}`} className="flex items-start gap-2 text-sm">
                {ready[`${index}-${document}`] ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                <span>{t(document)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
          {t('Ask the scheme agency about current rules, papers, rates, and payments. The agency makes the decision. This sheet is not sent to them.')}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
          <a href={scheme.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-700 hover:underline">{t('Official scheme details')} <ExternalLink className="h-3.5 w-3.5" /></a>
          {scheme.corporation === 'NSFDC' && <a href="https://pmsuraj.dosje.gov.in" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-700 hover:underline">{t('PM SURAJ application portal')} <ExternalLink className="h-3.5 w-3.5" /></a>}
        </div>
      </section>
    </div>
  );
}
