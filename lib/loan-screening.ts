import type { BeneficiaryCategory, ProjectType, SchemeProgramType, UserProfile } from './types';
import { SCHEMES_DATABASE } from './schemes-data';
import { matchSchemes } from './rule-engine';

export type LoanScreeningStatus =
  | 'needs_details'
  | 'outside_catalog'
  | 'no_listed_match'
  | 'conditional_match'
  | 'potential_match';

export interface LoanScreeningOption {
  schemeName: string;
  programType: SchemeProgramType;
  estimatedMaximumLoan?: number;
  projectCostShare?: number;
  rate: string;
  supportDetails: string[];
  conditionsToConfirm: string[];
}

export interface LoanScreening {
  status: LoanScreeningStatus;
  missingDetails: string[];
  reasons: string[];
  options: LoanScreeningOption[];
  profileFacts: string[];
  summary: string;
}

const PROJECT_TYPES: ProjectType[] = [
  'micro_business', 'term_loan_services', 'term_loan_mfg', 'transport_vehicle',
  'green_business', 'sanitation_mech', 'education_domestic', 'education_abroad', 'traditional_trade',
];
const CATEGORIES: BeneficiaryCategory[] = ['SC', 'ST', 'OBC', 'SafaiKaramchari', 'Minority', 'General'];

const formatRupees = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

function makeSummary(
  status: LoanScreeningStatus,
  missingDetails: string[],
  reasons: string[],
  options: LoanScreeningOption[],
  profileFacts: string[],
): string {
  const lines = [`Status: ${status.replaceAll('_', ' ')}.`];
  if (profileFacts.length) lines.push(`Profile facts used: ${profileFacts.join('; ')}.`);
  if (missingDetails.length) lines.push(`Ask the user for: ${missingDetails.join(', ')}.`);
  if (reasons.length) lines.push(`Screening reasons: ${reasons.join(' ')}`);
  if (options.length) {
    lines.push('Potential listed programmes:');
    for (const option of options) {
      const support = option.estimatedMaximumLoan === undefined
        ? `support type: ${option.programType.replaceAll('_', ' ')}`
        : `illustrative maximum loan based on the entered cost: ${formatRupees(option.estimatedMaximumLoan)}${option.projectCostShare === undefined ? '' : `, up to ${option.projectCostShare}% of cost subject to the scheme cap`}`;
      lines.push(`- ${option.schemeName}: ${support}. Published rate/terms: ${option.rate}.`);
      if (option.supportDetails.length) lines.push(`  Key support: ${option.supportDetails.join('; ')}.`);
      if (option.conditionsToConfirm.length) lines.push(`  Conditions to confirm: ${option.conditionsToConfirm.join('; ')}.`);
    }
  }
  lines.push('This is a preliminary screen of selected government programmes, not eligibility confirmation, a credit offer, or an application. The relevant authority and lender verify eligibility, documents, viability, funding windows, and final terms. A no-match result does not rule out other schemes or lenders.');
  return lines.join('\n');
}

function result(
  status: LoanScreeningStatus,
  missingDetails: string[] = [],
  reasons: string[] = [],
  options: LoanScreeningOption[] = [],
  profileFacts: string[] = [],
): LoanScreening {
  return { status, missingDetails, reasons, options, profileFacts, summary: makeSummary(status, missingDetails, reasons, options, profileFacts) };
}

function getProfileFacts(profile: Partial<UserProfile>): string[] {
  const facts: string[] = [];
  if (typeof profile.category === 'string' && CATEGORIES.includes(profile.category)) {
    facts.push(`Beneficiary category: ${profile.category}${profile.category === 'General' && profile.categoryProvided !== true ? ' (not confirmed)' : ''}`);
  } else facts.push('Beneficiary category: not confirmed');
  if (profile.category === 'SC' || profile.category === 'ST') {
    facts.push(profile.incomeProvided === true && Number.isFinite(profile.annualFamilyIncome)
      ? `Annual family income: ${formatRupees(Number(profile.annualFamilyIncome))}`
      : 'Annual family income: not confirmed');
    facts.push(`Caste certificate reported: ${profile.hasCasteCertificate === true ? 'yes' : 'no'}`);
    facts.push(`Income proof reported: ${profile.hasIncomeCertificate === true ? 'yes' : 'no'}`);
  }
  facts.push(profile.projectTypeProvided === true && PROJECT_TYPES.includes(profile.projectType as ProjectType)
    ? `Project or course type: ${String(profile.projectType).replace(/_/g, ' ')}`
    : 'Project or course type: not confirmed');
  facts.push(Number.isFinite(profile.estimatedCost) && Number(profile.estimatedCost) > 0
    ? `Estimated project or course cost: ${formatRupees(Number(profile.estimatedCost))}`
    : 'Estimated project or course cost: not entered');
  if (profile.age !== undefined) facts.push(`Applicant age entered: ${profile.age}`);
  if (profile.traditionalTrade) facts.push(`Traditional trade entered: ${profile.traditionalTrade}`);
  if (profile.streetVendorStatus && profile.streetVendorStatus !== 'unknown') facts.push(`Street-vendor status reported: ${profile.streetVendorStatus}`);
  if (profile.scStOwnedMseStatus && profile.scStOwnedMseStatus !== 'unknown') facts.push(`SC/ST-owned MSE status reported: ${profile.scStOwnedMseStatus}`);
  if (profile.projectType && String(profile.projectType).startsWith('education_')) {
    facts.push(`Eligible course admission reported: ${profile.hasAdmission === true ? 'yes' : 'not confirmed'}`);
  }
  if (profile.category === 'SafaiKaramchari') {
    facts.push(`Eligible sanitation-worker status reported: ${profile.hasSanitationWorkerEligibility === true ? 'yes' : 'not confirmed'}`);
  }
  if (Number.isFinite(profile.ownContribution)) facts.push(`Own contribution entered: ${formatRupees(Number(profile.ownContribution))}`);
  return facts;
}

export function screenLoanProfile(profile: Partial<UserProfile> | null | undefined): LoanScreening {
  if (!profile) return result('needs_details', ['beneficiary category', 'project purpose', 'project or course cost']);
  const profileFacts = getProfileFacts(profile);
  const knownCategory = typeof profile.category === 'string' && CATEGORIES.includes(profile.category);
  if (!knownCategory || (profile.category === 'General' && profile.categoryProvided !== true)) {
    return result('needs_details', ['beneficiary category'], [], [], profileFacts);
  }

  const missingDetails: string[] = [];
  if (profile.projectTypeProvided !== true || !PROJECT_TYPES.includes(profile.projectType as ProjectType)) {
    missingDetails.push('intended project or course type');
  }
  if (!Number.isFinite(profile.estimatedCost) || Number(profile.estimatedCost) <= 0) {
    missingDetails.push('estimated project or course cost');
  }
  if ((profile.category === 'SC' || profile.category === 'ST') && (
    profile.incomeProvided !== true || !Number.isFinite(profile.annualFamilyIncome) || Number(profile.annualFamilyIncome) < 0
  )) missingDetails.push('annual family income');
  if (missingDetails.length) return result('needs_details', missingDetails, [], [], profileFacts);

  const normalizedProfile: UserProfile = {
    name: typeof profile.name === 'string' ? profile.name : '',
    category: profile.category as BeneficiaryCategory,
    categoryProvided: true,
    annualFamilyIncome: Number(profile.annualFamilyIncome) || 0,
    incomeProvided: profile.incomeProvided === true,
    state: typeof profile.state === 'string' ? profile.state : '',
    district: typeof profile.district === 'string' ? profile.district : '',
    projectType: profile.projectType as ProjectType,
    projectTypeProvided: true,
    estimatedCost: Number(profile.estimatedCost),
    ownContribution: Number(profile.ownContribution) || 0,
    hasCasteCertificate: profile.hasCasteCertificate === true,
    hasIncomeCertificate: profile.hasIncomeCertificate === true,
    hasDPR: profile.hasDPR === true,
    hasAdmission: profile.hasAdmission,
    hasSanitationWorkerEligibility: profile.hasSanitationWorkerEligibility,
    age: profile.age,
    newEnterpriseStatus: profile.newEnterpriseStatus,
    streetVendorStatus: profile.streetVendorStatus,
    scStOwnedMseStatus: profile.scStOwnedMseStatus,
    traditionalTrade: profile.traditionalTrade,
    hasPreviousTarunRepayment: profile.hasPreviousTarunRepayment,
    projectLocationArea: profile.projectLocationArea,
    hasEighthGradeEducation: profile.hasEighthGradeEducation,
  };

  const allMatches = matchSchemes(normalizedProfile);
  const matches = allMatches.filter(({ scheme }) => {
    if (scheme.maxIncomeCeiling !== undefined && normalizedProfile.annualFamilyIncome > scheme.maxIncomeCeiling) return false;
    if (normalizedProfile.estimatedCost < (scheme.minProjectCost ?? 0)) return false;
    if (scheme.maxProjectCost !== undefined && normalizedProfile.estimatedCost > scheme.maxProjectCost) return false;
    return true;
  });

  if (!matches.length) {
    const reasons = allMatches.length ? ['The entered income or project cost falls outside the published range for the listed options.']
      : ['No listed programme matches the selected beneficiary group and project purpose.'];
    return result('no_listed_match', [], reasons, [], profileFacts);
  }

  const screeningReasons: string[] = [];
  if (normalizedProfile.category === 'SC' && normalizedProfile.annualFamilyIncome > 500000) {
    screeningReasons.push('NSFDC SC credit options are excluded because the reported annual family income is above its published ₹5 lakh ceiling.');
  }

  const options = matches.map(({ scheme, recommendedLoanAmount, caveats }) => {
    const isCalculatedLoan = recommendedLoanAmount !== undefined;
    const rate = scheme.interestRateLabel
      ?? (scheme.concessionalInterestRate !== undefined
        ? `${scheme.concessionalInterestRate}% p.a.`
        : scheme.programType === 'direct_loan'
          ? 'Lender-set; no single scheme-wide rate'
          : 'Not an applicant loan rate; see the programme support terms');
    const supportDetails = [
      ...(scheme.financialHighlights ?? []).map(item => `${item.label}: ${item.value}${item.note ? ` (${item.note})` : ''}`),
      ...(!scheme.financialHighlights?.length ? scheme.keyBenefits.slice(0, 2) : []),
      ...(scheme.availabilityNote ? [scheme.availabilityNote] : []),
    ];
    const conditionsToConfirm = [...caveats];
    if (scheme.id.startsWith('nsfdc-') && profile.hasCasteCertificate !== true) conditionsToConfirm.push('NSFDC requires a valid SC certificate');
    if (scheme.maxIncomeCeiling !== undefined && profile.hasIncomeCertificate !== true) conditionsToConfirm.push('income proof is required');
    if (scheme.id === 'nsfdc-els' && profile.hasAdmission !== true) conditionsToConfirm.push('admission to an eligible recognized full-time professional or technical course');
    if (scheme.id === 'nskfdc-swrs' && profile.hasSanitationWorkerEligibility !== true) conditionsToConfirm.push('verification of eligible sanitation-worker status');
    if (scheme.channelPartnerTypes.includes('COOP') || scheme.channelPartnerTypes.includes('SFB')) conditionsToConfirm.push('availability depends on an eligible cooperative or small finance bank');
    if (isCalculatedLoan && scheme.maxLoanPercentage !== undefined) {
      const gap = Math.max(0, normalizedProfile.estimatedCost - recommendedLoanAmount - normalizedProfile.ownContribution);
      if (gap > 0) conditionsToConfirm.push(`about ${formatRupees(gap)} of project cost is outside the entered contribution and estimated maximum loan`);
    }
    return {
      schemeName: scheme.name,
      programType: scheme.programType ?? 'direct_loan',
      ...(recommendedLoanAmount === undefined ? {} : { estimatedMaximumLoan: recommendedLoanAmount }),
      ...(scheme.maxLoanPercentage === undefined ? {} : { projectCostShare: scheme.maxLoanPercentage }),
      rate,
      supportDetails,
      conditionsToConfirm: [...new Set(conditionsToConfirm)],
    };
  });

  const hasConditions = matches.some(({ caveats }) => caveats.length > 0)
    || options.some(option => option.conditionsToConfirm.length > 0);
  return result(hasConditions ? 'conditional_match' : 'potential_match', [], screeningReasons, options, profileFacts);
}
