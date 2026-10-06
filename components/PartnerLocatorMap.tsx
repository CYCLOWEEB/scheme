'use client';

import React, { useMemo, useState } from 'react';
import { ExternalLink, Building2, Search, MapPin, Info } from 'lucide-react';
import AgencyLocationsMap from '@/components/AgencyLocationsMap';
import { INDIAN_STATES_AND_UTS } from '@/lib/indian-states';
import { OFFICIAL_SCA_DIRECTORY, OFFICIAL_SCA_SOURCE } from '@/lib/official-sca-data';
import { SCHEMES_DATABASE } from '@/lib/schemes-data';
import { displayState, tr } from '@/lib/ui-copy';

interface PartnerLocatorMapProps {
  language: string;
  initialSchemeId?: string;
  userState?: string;
  isActive?: boolean;
}

export default function PartnerLocatorMap({
  language,
  initialSchemeId = 'all',
  userState = 'Delhi',
  isActive = true,
}: PartnerLocatorMapProps) {
  const t = (text: string) => tr(language, text);
  const scheme = SCHEMES_DATABASE.find(item => item.id === initialSchemeId);
  const normalizedUserState = INDIAN_STATES_AND_UTS.includes(userState) ? userState : 'Delhi';
  const [stateChoice, setStateChoice] = useState({ sourceState: userState, value: normalizedUserState });
  const selectedState = stateChoice.sourceState === userState ? stateChoice.value : normalizedUserState;
  const [searchQuery, setSearchQuery] = useState('');

  const listedAgencies = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return OFFICIAL_SCA_DIRECTORY.filter(item => item.state === selectedState)
      .filter(item => !query || `${item.name} ${item.address}`.toLocaleLowerCase().includes(query));
  }, [selectedState, searchQuery]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800">
              <Building2 className="h-3.5 w-3.5" /> {t('Official channel agency directory')}
            </span>
            <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              {t('Find a state channel agency')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t('This list is from NSFDC. Call first to check the address, open schemes, and how to apply.')}
            </p>
          </div>
          <a
            href="https://nsfdc.nic.in/our-channel-partners"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"
          >
            {t('See full agency list')} <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {scheme?.corporation === 'NSKFDC' && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <b>{t('This scheme is from NSKFDC.')}</b> {t('The list below is from NSFDC. Ask')} <a className="font-semibold underline" href={scheme.sourceUrl} target="_blank" rel="noreferrer">NSKFDC</a> {t('about the rules and where to apply.')}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label htmlFor="directory-state" className="mb-1.5 block text-xs font-bold text-slate-700">{t('State / UT')}</label>
            <select
              id="directory-state"
              value={selectedState}
              onChange={event => { setStateChoice({ sourceState: userState, value: event.target.value }); setSearchQuery(''); }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {INDIAN_STATES_AND_UTS.map(state => <option key={state} value={state}>{displayState(language, state)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="directory-search" className="mb-1.5 block text-xs font-bold text-slate-700">{t('Search by name or address')}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="directory-search"
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder={t('Search this list')}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
          <p>{t('This list may be out of date. It does not show open funding or application status. Call the agency or use PM-SURAJ to check.')}</p>
        </div>
      </section>

      {listedAgencies.length > 0 ? (
        <section aria-live="polite" className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700">{t(`${listedAgencies.length} ${listedAgencies.length === 1 ? 'agency' : 'agencies'} in ${displayState(language, selectedState)}`)}</h3>
          <AgencyLocationsMap agencies={listedAgencies} isActive={isActive} language={language} />
          <div className="grid gap-4 md:grid-cols-2">
            {listedAgencies.map((agency, index) => (
              <article key={`${agency.name}-${index}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Building2 className="h-4 w-4" /></div>
                  <div>
                    <h4 className="text-sm font-bold leading-snug text-slate-900">{agency.name}</h4>
                    <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />{agency.address}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <h3 className="font-bold text-slate-900">{t(`No agency listed for ${displayState(language, selectedState)}`)}</h3>
          <p className="mt-2 text-sm text-slate-600">{t('See the full official list or ask your local agency.')}</p>
        </section>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        <a href={OFFICIAL_SCA_SOURCE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:underline">{t('Open the source agency list')} <ExternalLink className="h-3.5 w-3.5" /></a>
        {scheme?.corporation !== 'NSKFDC' && <a href="https://pmsuraj.dosje.gov.in" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:underline">{t('PM SURAJ application portal')} <ExternalLink className="h-3.5 w-3.5" /></a>}
      </div>
    </div>
  );
}
