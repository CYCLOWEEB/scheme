import { Clock3, ExternalLink, Phone } from 'lucide-react';
import { OFFICIAL_AGENCY_CONTACTS } from '@/lib/agency-contact-data';
import { tr } from '@/lib/ui-copy';

interface AgencyContactDetailsProps {
  agencyName: string;
  language: string;
}

export default function AgencyContactDetails({ agencyName, language }: AgencyContactDetailsProps) {
  const contact = OFFICIAL_AGENCY_CONTACTS[agencyName];
  if (!contact?.phone && !contact?.officeHours) return null;

  const t = (text: string) => tr(language, text);

  return (
    <div className="mt-4 space-y-2 border-t border-blue-50 pt-3">
      {contact.phone && (
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <Phone className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
          <a
            href={`tel:+91${contact.phone.number.replace(/\D/g, '').replace(/^0/, '')}`}
            aria-label={`${t('Call agency')}: ${agencyName}, ${contact.phone.number}`}
            className="agency-contact-link inline-flex min-h-9 items-center font-semibold tabular-nums text-blue-700 hover:text-blue-900"
          >
            {contact.phone.number}
          </a>
          <a
            href={contact.phone.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${t('Official phone source')}: ${agencyName}`}
            title={t('Official phone source')}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      )}
      {contact.officeHours && (
        <div className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
          <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-500">{t('Approx. office hours (IST)')}</p>
            <p className="mt-0.5">{language === 'hi' ? contact.officeHours.hi : contact.officeHours.en}</p>
          </div>
          <a
            href={contact.officeHours.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${t('Official hours source')}: ${agencyName}`}
            title={t('Official hours source')}
            className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}
