'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, ExternalLink, FileText, Printer, ShieldCheck } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { SCHEMES_DATABASE } from '@/lib/schemes-data';

interface DocumentLockerProps {
  userProfile: UserProfile;
  selectedSchemeId?: string;
}

function isReadyFromProfile(document: string, profile: UserProfile): boolean {
  const label = document.toLowerCase();
  if (label.includes('sc certificate')) return profile.hasCasteCertificate;
  if (label.includes('income proof')) return profile.hasIncomeCertificate;
  if (label.includes('admission')) return Boolean(profile.hasAdmission);
  if (label.includes('sanitation-worker')) return Boolean(profile.hasSanitationWorkerEligibility);
  if (label.includes('project report') || label.includes('quotation') || label.includes('estimate')) return profile.hasDPR;
  return false;
}

export default function DocumentLocker({ userProfile, selectedSchemeId = 'nsfdc-tls' }: DocumentLockerProps) {
  const [currentSchemeId, setCurrentSchemeId] = useState(selectedSchemeId);
  const scheme = SCHEMES_DATABASE.find(item => item.id === currentSchemeId) ?? SCHEMES_DATABASE[0];
  const requirements = scheme.mandatoryDocuments;
  const [ready, setReady] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(requirements.map((document, index) => [`${index}-${document}`, isReadyFromProfile(document, userProfile)])),
  );
  const [dateLabel, setDateLabel] = useState('');
  useEffect(() => setDateLabel(new Date().toLocaleDateString('en-IN')), []);
  const readyCount = requirements.filter((document, index) => ready[`${index}-${document}`]).length;
  const readinessPercent = requirements.length ? Math.round((readyCount / requirements.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Personal document checklist
            </span>
            <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Prepare for an application</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">Mark documents you have on hand. These marks remain in memory while this view is open; no files are uploaded, stored, or verified by this tool.</p>
          </div>
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 md:max-w-xs">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Self-reported readiness</span><span className="text-sky-700">{readinessPercent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-sky-600 transition-all" style={{ width: `${readinessPercent}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{readyCount} of {requirements.length} items marked as available</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Checklist for {scheme.name}</h3>
            <span className="text-[11px] text-slate-500">Confirm the current list with the channel agency.</span>
          </div>
          <div className="sm:min-w-72">
            <label htmlFor="document-scheme-select" className="mb-1 block text-[11px] font-bold text-slate-600">Choose a scheme</label>
            <select id="document-scheme-select" value={currentSchemeId} onChange={event => {
              const nextSchemeId = event.target.value;
              const nextScheme = SCHEMES_DATABASE.find(item => item.id === nextSchemeId);
              if (!nextScheme) return;
              setCurrentSchemeId(nextSchemeId);
              setReady(Object.fromEntries(nextScheme.mandatoryDocuments.map((document, index) => [`${index}-${document}`, isReadyFromProfile(document, userProfile)])));
            }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500">
              {SCHEMES_DATABASE.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
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
                  <span className="block text-sm font-semibold text-slate-900">{document}</span>
                  <span className="mt-1 block text-xs text-slate-500">{isReady ? 'Marked as available by you' : 'Not marked as available'}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-sky-300"><FileText className="h-3.5 w-3.5" /> Print-friendly preparation sheet</p>
          <h3 className="mt-1 text-lg font-bold">Review your details before visiting or applying online</h3>
          <p className="mt-1 text-xs text-slate-300">The sheet is personal planning material. It is not a government form, application, approval, or submission receipt.</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
        >
          <Printer className="h-4 w-4" /> Print or save as PDF
        </button>
      </section>

      <section id="print-dossier" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-800">Independent planning aid · Not an official form</p>
          <h3 className="mt-1 text-xl font-black text-slate-900">Scheme application preparation sheet</h3>
          <p className="mt-1 text-xs text-slate-500">Prepared {dateLabel} · No application has been sent or saved.</p>
        </div>

        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Applicant details entered</h4>
            <p><b>Name:</b> {userProfile.name || 'Not entered'}</p>
            <p><b>Category:</b> {userProfile.category}</p>
            <p><b>Annual family income:</b> ₹{userProfile.annualFamilyIncome.toLocaleString('en-IN')}</p>
            <p><b>State / UT:</b> {userProfile.state}</p>
            <p><b>District:</b> {userProfile.district || 'Not entered'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Scheme estimate</h4>
            <p><b>Scheme:</b> {scheme.name}</p>
            <p><b>Project / course cost:</b> ₹{userProfile.estimatedCost.toLocaleString('en-IN')}</p>
            <p><b>Own contribution entered:</b> ₹{userProfile.ownContribution.toLocaleString('en-IN')}</p>
            <p><b>Published beneficiary rate:</b> {scheme.interestRateLabel ?? `${scheme.concessionalInterestRate}%`} p.a.</p>
            <p><b>Maximum listed loan:</b> ₹{scheme.maxLoanAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Documents marked available</h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {requirements.map((document, index) => (
              <li key={`${index}-${document}`} className="flex items-start gap-2 text-sm">
                {ready[`${index}-${document}`] ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                <span>{document}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
          Confirm all current eligibility conditions, documents, rates, and repayment terms with the scheme authority. The channel agency makes the decision. This preparation sheet is not submitted to any authority.
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
          <a href={scheme.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-700 hover:underline">Official scheme details <ExternalLink className="h-3.5 w-3.5" /></a>
          {scheme.corporation === 'NSFDC' && <a href="https://pmsuraj.dosje.gov.in" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-700 hover:underline">PM SURAJ application portal <ExternalLink className="h-3.5 w-3.5" /></a>}
        </div>
      </section>
    </div>
  );
}
