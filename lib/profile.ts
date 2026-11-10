import type { BeneficiaryCategory, ProjectType, UserProfile } from './types';

export const PROFILE_STORAGE_KEY = 'scheme-lens-profile-v1';
export const PROFILE_PHOTO_STORAGE_KEY = 'scheme-lens-profile-photo-v1';

export const PROFILE_CATEGORIES: { value: BeneficiaryCategory; label: string }[] = [
  { value: 'General', label: 'General / other category' },
  { value: 'SC', label: 'SC · Scheduled Caste' },
  { value: 'ST', label: 'ST · Scheduled Tribe' },
  { value: 'OBC', label: 'OBC · Other Backward Class' },
  { value: 'Minority', label: 'Notified minority' },
  { value: 'SafaiKaramchari', label: 'Eligible sanitation worker' },
];

export const PROJECT_LABELS: Record<ProjectType, string> = {
  micro_business: 'Small business',
  term_loan_services: 'Services',
  term_loan_mfg: 'Manufacturing',
  transport_vehicle: 'Transport',
  green_business: 'Green business',
  sanitation_mech: 'Sanitation equipment',
  education_domestic: 'Higher education in India',
  education_abroad: 'Higher education abroad',
  traditional_trade: 'Artisan or craft work',
};

export function createEmptyProfile(): UserProfile {
  return {
    name: '',
    category: 'General',
    categoryProvided: false,
    annualFamilyIncome: 0,
    incomeProvided: false,
    state: '',
    district: '',
    projectType: 'micro_business',
    projectTypeProvided: false,
    estimatedCost: 0,
    ownContribution: 0,
    hasCasteCertificate: false,
    hasIncomeCertificate: false,
    hasDPR: false,
    newEnterpriseStatus: 'unknown',
    streetVendorStatus: 'unknown',
    scStOwnedMseStatus: 'unknown',
    projectLocationArea: 'unknown',
  };
}

export function isProfileReady(profile: UserProfile): boolean {
  return profile.categoryProvided === true
    && PROFILE_CATEGORIES.some(category => category.value === profile.category)
    && Number.isInteger(profile.age)
    && Number(profile.age) >= 1
    && Number(profile.age) <= 120;
}

export function restoreProfile(serialized: string | null): UserProfile {
  const profile = createEmptyProfile();
  if (!serialized) return profile;

  try {
    const saved: unknown = JSON.parse(serialized);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return profile;
    const data = saved as Record<string, unknown>;

    for (const key of ['name', 'state', 'district', 'traditionalTrade'] as const) {
      if (typeof data[key] === 'string') profile[key] = data[key].slice(0, 100);
    }
    if (PROFILE_CATEGORIES.some(category => category.value === data.category)) {
      profile.category = data.category as BeneficiaryCategory;
      profile.categoryProvided = data.categoryProvided === true;
    }
    if (typeof data.projectType === 'string' && Object.hasOwn(PROJECT_LABELS, data.projectType)) {
      profile.projectType = data.projectType as ProjectType;
      profile.projectTypeProvided = data.projectTypeProvided === true;
    }
    if (typeof data.age === 'number' && Number.isInteger(data.age) && data.age >= 1 && data.age <= 120) {
      profile.age = data.age;
    }
    for (const key of ['annualFamilyIncome', 'estimatedCost', 'ownContribution'] as const) {
      if (typeof data[key] === 'number' && Number.isFinite(data[key]) && data[key] >= 0) profile[key] = data[key];
    }
    for (const key of ['incomeProvided', 'hasCasteCertificate', 'hasIncomeCertificate', 'hasDPR', 'hasAdmission', 'hasSanitationWorkerEligibility', 'hasPreviousTarunRepayment', 'hasEighthGradeEducation'] as const) {
      if (typeof data[key] === 'boolean') profile[key] = data[key];
    }
    for (const key of ['newEnterpriseStatus', 'streetVendorStatus', 'scStOwnedMseStatus'] as const) {
      if (data[key] === 'yes' || data[key] === 'no' || data[key] === 'unknown') profile[key] = data[key];
    }
    if (data.projectLocationArea === 'rural' || data.projectLocationArea === 'urban') {
      profile.projectLocationArea = data.projectLocationArea;
    }
    return profile;
  } catch {
    return profile;
  }
}
