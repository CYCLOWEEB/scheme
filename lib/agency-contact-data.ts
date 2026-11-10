/**
 * Only contact details explicitly published on government websites belong here.
 * Match each entry to the existing agency and office; omit unconfirmed fields.
 * A published number has not been tested by placing a call. Office hours are
 * approximate visiting guidance, not a live open/closed status or holiday calendar.
 */
export interface OfficialAgencyContact {
  phone?: {
    /** Indian national format, including the STD code and leading zero. */
    number: string;
    sourceUrl: string;
  };
  officeHours?: {
    en: string;
    hi: string;
    sourceUrl: string;
  };
}

export const AGENCY_CONTACTS_CHECKED_ON = '2026-10-15';

export const OFFICIAL_AGENCY_CONTACTS: Readonly<Partial<Record<string, OfficialAgencyContact>>> = {
  'Andhra Pradesh Scheduled Castes Cooperative Finance Corporation Ltd. (APSCCFC)': {
    phone: { number: '08645-274002', sourceUrl: 'https://nskfdc.nic.in/en/content/home/list-channelizing-agencies' },
  },
  'Assam State Development Corporation for SCs Ltd. (ASCDC)': {
    phone: { number: '0361-2261796', sourceUrl: 'https://sje.gujarat.gov.in/gskvn/assets/downloads/NSKFDC_landing_policy_31072024.pdf' },
  },
  'Bihar State SCs Co-operative Development Corporation Ltd. (BSSCCDC)': {
    phone: { number: '0612-2525612', sourceUrl: 'https://nskfdc.nic.in/en/content/home/list-channelizing-agencies' },
  },
  'Chandigarh SCs, BCs & Minorities Financial & Development Corporation Ltd. (CSCFDC)': {
    phone: { number: '0172-2700372', sourceUrl: 'https://nskfdc.nic.in/en/content/home/list-channelizing-agencies' },
  },
  'Chhattisgarh State Antavasayee Sahkari Finance & Development Corporation (CGSCFDC)': {
    phone: { number: '0771-4248601', sourceUrl: 'https://sje.gujarat.gov.in/gskvn/assets/downloads/NSKFDC_landing_policy_31072024.pdf' },
  },
  'Dadra & Nagar Haveli, Daman & Diu SCs/STs/OBCs & Minorities Financial & Development Corporation (DNDSFDC)': {
    phone: { number: '0260-2642044', sourceUrl: 'https://sje.gujarat.gov.in/gskvn/assets/downloads/NSKFDC_landing_policy_31072024.pdf' },
  },
  'Delhi SC/ST/OBC/Minorities & Handicapped Financial & Development Corporation (DSFDC)': {
    phone: { number: '011-27574377', sourceUrl: 'https://dsfdc.delhi.gov.in/dsfdc/contact-us' },
    officeHours: {
      en: '9:30 am–6:00 pm · Lunch 1:30–2:00 pm',
      hi: 'सुबह 9:30–शाम 6:00 · भोजन अवकाश दोपहर 1:30–2:00',
      sourceUrl: 'https://dsfdc.delhi.gov.in/dsfdc/mannual-1',
    },
  },
  'Gujarat SCs Development Corporation (GSCDC)': {
    phone: { number: '079-23253883', sourceUrl: 'https://sje.gujarat.gov.in/gscdc/search?lang=English' },
  },
  'Dr. Ambedkar Antyodaya Vikas Nigam (S.C.) (DAAVN)': {
    phone: { number: '079-23256325', sourceUrl: 'https://sje.gujarat.gov.in/gapb/Hod-Boards-Corporations?lang=English' },
  },
  'Goa State SCs & OBCs Finance and Development Corporation Ltd. (GSCOBCDC)': {
    phone: { number: '0832-2438180', sourceUrl: 'https://www.nbcfdc.gov.in/nbcfdc/web/scas' },
  },
  'Himachal Pradesh SCs & STs Development Corporation (HPSCSTDC)': {
    phone: { number: '01792-220671', sourceUrl: 'https://hpscstdc.hp.gov.in/contact-us' },
  },
  'Jharkhand State Scheduled Castes Cooperative Development Corporation (JSCDC)': {
    phone: { number: '0651-2552398', sourceUrl: 'https://nskfdc.nic.in/en/content/home/list-channelizing-agencies' },
  },
  'Kerala State Development Corporation for SCs & STs Ltd. (KSDC)': {
    phone: { number: '0487-2331064', sourceUrl: 'https://www.ksdcscst.kerala.gov.in/Contact' },
    officeHours: {
      en: 'Mon–Sat · 10:00 am–5:00 pm',
      hi: 'सोम–शनि · सुबह 10:00–शाम 5:00',
      sourceUrl: 'https://www.ksdcscst.kerala.gov.in/Contact',
    },
  },
  'Kerala State Women’s Development Corporation (KSWDC)': {
    phone: { number: '0471-2454585', sourceUrl: 'https://kerala.gov.in/subsubdetail/MTA0NTM5NzIyLjc2/NjUxNDAzMjkuNzY%3D' },
  },
  'MP State Cooperative SC Finance & Development Corporation (MPSCFDC)': {
    phone: { number: '0755-2661744', sourceUrl: 'https://nskfdc.nic.in/en/content/home/list-channelizing-agencies' },
  },
  'Mahatma Phule BCs Development Corporation Ltd. (MPBCDC)': {
    phone: { number: '022-26200351', sourceUrl: 'https://sjsa.maharashtra.gov.in/en/organization/mahatma-phule-backward-class-development-corporation-mumbai/' },
    officeHours: {
      // Published 2020 citizen charter; retain the source and approximate label.
      en: 'Mon–Fri · 9:45 am–6:15 pm',
      hi: 'सोम–शुक्र · सुबह 9:45–शाम 6:15',
      sourceUrl: 'https://mpbcdc.maharashtra.gov.in/Upload/PDF/Citizen%20Charter.pdf',
    },
  },
  'Sahityaratna Lokshahir Annabhau Sathe Development Corporation Ltd. (SLASDC)': {
    phone: { number: '022-25274072', sourceUrl: 'https://sjsa.maharashtra.gov.in/en/organization-type/corporations/' },
  },
  'Sant Rohidas Leather Industries & Charmakar Development Corporation (LIDCOM)': {
    phone: { number: '022-22044186', sourceUrl: 'https://sjsa.maharashtra.gov.in/en/organization/sant-rohidas-leather-industries-charmakar-development-corporation-ltd-lidcom/' },
  },
  'Manipur Tribal Development Corporation Ltd. (MTDC)': {
    phone: { number: '0385-2310452', sourceUrl: 'https://nstfdc.tribal.gov.in/CuteSoft_Client/writereaddata/upload/NSTFDC_AR%20-%202024-25_Final_03-12-25_English.pdf#page=136' },
  },
  'Meghalaya Cooperative Apex Bank Ltd. (MCAB)': {
    phone: { number: '0364-2224166', sourceUrl: 'https://nstfdc.tribal.gov.in/CuteSoft_Client/writereaddata/upload/NSTFDC_AR%20-%202024-25_Final_03-12-25_English.pdf#page=136' },
  },
  'Mizoram Urban Cooperative Development Bank Ltd. (MUCO Bank)': {
    phone: { number: '0389-2343475', sourceUrl: 'https://nstfdc.tribal.gov.in/CuteSoft_Client/writereaddata/upload/NSTFDC_AR%20-%202024-25_Final_03-12-25_English.pdf#page=136' },
  },
  'Odisha SCs & STs Development Finance Co-operative Corporation Ltd. (OSFDC)': {
    phone: { number: '0674-2431798', sourceUrl: 'https://nstfdc.tribal.gov.in/CuteSoft_Client/writereaddata/upload/NSTFDC_AR%20-%202024-25_Final_03-12-25_English.pdf#page=137' },
  },
  'Puducherry Adi Dravidar Development Corporation Ltd. (PADCO)': {
    phone: { number: '0413-2277318', sourceUrl: 'https://www.py.gov.in/sites/default/files/padco09022026tn.pdf' },
  },
  'Punjab Scheduled Castes Land Development & Finance Corporation (PSCLDFC)': {
    phone: { number: '0172-5025092', sourceUrl: 'https://nskfdc.nic.in/en/content/home/list-channelizing-agencies' },
  },
  'Rajasthan SCs & STs Finance & Development Co-operative Corporation Ltd. (RSCDC)': {
    phone: { number: '0141-2740833', sourceUrl: 'https://nskfdc.nic.in/en/content/home/list-channelizing-agencies' },
  },
  'Sikkim Scheduled Castes, Scheduled Tribes & Backward Classes Development Corporation (SSCSTBCDC)': {
    phone: { number: '03592-205318', sourceUrl: 'https://nskfdc.nic.in/en/content/home/list-channelizing-agencies' },
  },
  'Tamil Nadu Adi Dravidar Housing & Development Corporation Ltd. (TAHDCO)': {
    phone: { number: '044-24310197', sourceUrl: 'https://nstfdc.tribal.gov.in/CuteSoft_Client/writereaddata/upload/NSTFDC_AR%20-%202024-25_Final_03-12-25_English.pdf#page=137' },
  },
  'Tripura Scheduled Castes Co-operative Development Corporation Ltd. (TSCDC)': {
    phone: { number: '0381-2326515', sourceUrl: 'https://nskfdc.nic.in/en/content/home/list-channelizing-agencies' },
  },
  'Uttarakhand Bahu-udeshiya Vitta Evam Vikas Nigam (UBVEVN)': {
    phone: { number: '0135-2675226', sourceUrl: 'https://nbcfdc.gov.in/nbcfdc/web/en/node/69' },
  },
  'UP Sahkari Gram Vikas Bank Ltd.': {
    phone: { number: '0522-2238844', sourceUrl: 'https://nbcfdc.gov.in/nbcfdc/web/en/node/69' },
  },
  'UP Scheduled Castes Finance & Development Corporation Ltd. (UPSCFDC)': {
    phone: { number: '0522-2322085', sourceUrl: 'https://nskfdc.nic.in/en/content/home/list-channelizing-agencies' },
  },
  'West Bengal SCs, STs & OBC Development & Finance Corporation (WBSCSTOBCDFC)': {
    phone: { number: '033-40261500', sourceUrl: 'https://nbcfdc.gov.in/nbcfdc/web/en/node/69' },
  },
};
