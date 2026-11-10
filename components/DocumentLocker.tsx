'use client';

import React, { useState } from 'react';
import AIInsightPanel from '@/components/AIInsightPanel';
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
    <div className="entry-stack space-y-7">
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">
              <ShieldCheck className="entry-icon h-3.5 w-3.5" /> {t('AI-assisted document preparation')}
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{t('Prepare your documents with AI')}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{t('Mark what you have, then ask AI what to prepare next. Files are not read or verified here.')}</p>
          </div>
          <div className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 p-5 md:max-w-xs">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>{t('Your checklist')}</span><span className="text-blue-700">{readinessPercent}%</span>
            </div>
            <div role="progressbar" aria-label={t('Your checklist')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={readinessPercent} className="h-3 overflow-hidden rounded-full bg-blue-100">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${readinessPercent}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-600">{t(`${readyCount} of ${requirements.length} papers ready`)}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold leading-relaxed text-slate-800">{t('Checklist for')} {displayScheme.name}</h3>
            <span className="text-xs text-slate-600">{t('Ask the agency for its latest list.')}</span>
          </div>
          <div className="w-full min-w-0 sm:w-80 sm:shrink-0">
          <label htmlFor="document-scheme-select" className="mb-2 block text-sm font-semibold text-slate-600">{t('Choose a scheme')}</label>
            <select id="document-scheme-select" value={currentSchemeId} onChange={event => {
              const nextSchemeId = event.target.value;
              const nextScheme = SCHEMES_DATABASE.find(item => item.id === nextSchemeId);
              if (!nextScheme) return;
              setCurrentSchemeId(nextSchemeId);
              setReady(Object.fromEntries(nextScheme.mandatoryDocuments.map((document, index) => [`${index}-${document}`, isReadyFromProfile(document, userProfile)])));
            }} className="w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100">
              {SCHEMES_DATABASE.map(item => <option key={item.id} value={item.id}>{localizeScheme(item, language).name}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-4"><AIInsightPanel
          tool="documents"
          language={language}
          schemeIds={[scheme.id]}
          profile={userProfile}
          readyDocumentIndices={requirements.flatMap((document, index) => ready[`${index}-${document}`] ? [index] : [])}
        /></div>
        <div className="grid gap-4 md:grid-cols-2">
          {requirements.map((document, index) => {
            const id = `${index}-${document}`;
            const isReady = Boolean(ready[id]);
            return (
              <label key={id} htmlFor={`document-${index}`} className="flex min-h-24 cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40 has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50/70 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500">
                <input
                  id={`document-${index}`}
                  type="checkbox"
                  checked={isReady}
                  onChange={event => setReady(current => ({ ...current, [id]: event.target.checked }))}
                  className="sr-only"
                />
                {isReady ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" /> : <Circle className="mt-0.5 h-6 w-6 shrink-0 text-slate-400" />}
                <span>
                  <span className="block text-sm font-semibold leading-relaxed text-slate-900">{t(document)}</span>
                  <span className="mt-1 block text-xs text-slate-600">{isReady ? t('You have this') : t('Still needed')}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-3xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6 text-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-800"><FileText className="h-3.5 w-3.5" /> {t('Print-friendly preparation sheet')}</p>
          <h3 className="mt-1 text-lg font-bold">{t('Review your details before visiting or applying online')}</h3>
          <p className="mt-1 text-xs text-slate-600">{t('This is your checklist, not a government form or application.')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDateLabel(new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN'));
            window.setTimeout(() => window.print(), 0);
          }}
          className="min-h-12 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
        >
          <Printer className="h-4 w-4" /> {t('Print or save as PDF')}
        </button>
      </section>

      <section id="print-dossier" className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-800">{t('Independent planning aid · Not an official form')}</p>
          <h3 className="mt-1 text-xl font-extrabold text-slate-900">{t('Scheme application preparation sheet')}</h3>
          <p className="mt-1 text-xs text-slate-600">{t('Prepared')} {dateLabel} · {t('No application has been sent or saved.')}</p>
        </div>

        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">{t('Applicant details entered')}</h4>
            <p><b>{t('Name:')}</b> {userProfile.name || t('Not entered')}</p>
            <p><b>{t('Category:')}</b> {t(userProfile.category)}</p>
            <p><b>{t('Annual family income:')}</b> ₹{userProfile.annualFamilyIncome.toLocaleString('en-IN')}</p>
            <p><b>{t('State / UT:')}</b> {displayState(language, userProfile.state)}</p>
            <p><b>{t('District:')}</b> {userProfile.district || t('Not entered')}</p>
          </div>
          <div className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">{t('Scheme estimate')}</h4>
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
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">{t('Documents marked available')}</h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {requirements.map((document, index) => (
              <li key={`${index}-${document}`} className="flex items-start gap-2 text-sm">
                {ready[`${index}-${document}`] ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                <span>{t(document)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950">
          {t('Ask the scheme agency about current rules, papers, rates, and payments. The agency makes the decision. This sheet is not sent to them.')}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
          <a href={scheme.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-blue-700 hover:underline">{t('Official scheme details')} <ExternalLink className="h-3.5 w-3.5" /></a>
          {scheme.corporation === 'NSFDC' && <a href="https://pmsuraj.dosje.gov.in" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-blue-700 hover:underline">{t('PM SURAJ application portal')} <ExternalLink className="h-3.5 w-3.5" /></a>}
        </div>
      </section>
    </div>
  );
}
