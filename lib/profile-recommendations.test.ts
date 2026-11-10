import { describe, expect, it } from 'bun:test';
import { createEmptyProfile, isProfileReady, restoreProfile } from './profile';
import { getProfileRecommendations, matchSchemes } from './rule-engine';
import type { UserProfile } from './types';

const basicProfile: UserProfile = {
  ...createEmptyProfile(),
  name: 'Test Applicant',
  age: 28,
  category: 'SC',
  categoryProvided: true,
};

describe('profile recommendations', () => {
  it('waits for an actual age and category, including an explicit General selection', () => {
    expect(getProfileRecommendations(createEmptyProfile())).toEqual([]);
    expect(getProfileRecommendations({ ...basicProfile, age: undefined })).toEqual([]);
    expect(getProfileRecommendations({ ...basicProfile, categoryProvided: false })).toEqual([]);
    expect(getProfileRecommendations({ ...basicProfile, category: 'General' }).length).toBeGreaterThan(0);
    for (const age of [0, -1, 121, 28.5, NaN, Infinity]) {
      expect(isProfileReady({ ...basicProfile, age })).toBe(false);
    }
  });

  it('suggests options without inventing an income, budget or goal', () => {
    const options = getProfileRecommendations(basicProfile);
    expect(options.some(scheme => scheme.id === 'nsfdc-mfs')).toBe(true);
    expect(options.some(scheme => scheme.id === 'nsfdc-els')).toBe(true);
    expect(matchSchemes(basicProfile)).toEqual([]);
    expect(basicProfile.estimatedCost).toBe(0);
    expect(basicProfile.incomeProvided).toBe(false);
    expect(basicProfile.projectTypeProvided).toBe(false);
  });

  it('refreshes category-specific suggestions when the category changes', () => {
    const scOptions = getProfileRecommendations(basicProfile);
    const obcOptions = getProfileRecommendations({ ...basicProfile, category: 'OBC' });
    expect(scOptions.some(scheme => scheme.corporation === 'NSFDC')).toBe(true);
    expect(obcOptions.some(scheme => scheme.corporation === 'NSFDC')).toBe(false);
    expect(obcOptions.some(scheme => scheme.id === 'pmmy')).toBe(true);
    expect(obcOptions.every(scheme => scheme.targetBeneficiaries.includes('OBC'))).toBe(true);
  });

  it('rechecks the catalog age boundaries after an age edit', () => {
    const idsAt = (age: number) => getProfileRecommendations({ ...basicProfile, age }).map(scheme => scheme.id);
    expect(idsAt(28)).toContain('pmegp');
    expect(idsAt(18)).not.toContain('pmegp');
    expect(idsAt(18)).toContain('pm-vishwakarma');
    expect(idsAt(17)).not.toContain('pm-vishwakarma');
  });

  it('uses the selected goal while preserving the applicant details', () => {
    const profile: UserProfile = { ...basicProfile, projectType: 'education_domestic', projectTypeProvided: true };
    const options = getProfileRecommendations(profile);
    expect(options.some(scheme => scheme.id === 'nsfdc-els')).toBe(true);
    expect(options.every(scheme => scheme.projectTypes.includes('education_domestic'))).toBe(true);
    expect(profile.name).toBe('Test Applicant');
    expect(profile.age).toBe(28);
    expect(profile.estimatedCost).toBe(0);
  });

  it('applies optional income and project cost only when supplied', () => {
    const highIncome = { ...basicProfile, annualFamilyIncome: 600000, incomeProvided: true };
    expect(getProfileRecommendations(highIncome).some(scheme => scheme.corporation === 'NSFDC')).toBe(false);
    expect(getProfileRecommendations({ ...highIncome, incomeProvided: false }).some(scheme => scheme.id === 'nsfdc-mfs')).toBe(true);
    const services: UserProfile = { ...basicProfile, projectType: 'term_loan_services', projectTypeProvided: true, estimatedCost: 2500000 };
    expect(getProfileRecommendations(services).some(scheme => scheme.id === 'pmegp')).toBe(false);
    expect(getProfileRecommendations({ ...services, estimatedCost: 0 }).some(scheme => scheme.id === 'pmegp')).toBe(true);
  });

  it('agrees with detailed matching for a fully specified profile', () => {
    const profile: UserProfile = {
      ...basicProfile, projectType: 'micro_business', projectTypeProvided: true,
      estimatedCost: 120000, annualFamilyIncome: 140000, incomeProvided: true,
      ownContribution: 12000, streetVendorStatus: 'no', scStOwnedMseStatus: 'no',
    };
    const suggested = getProfileRecommendations(profile).map(scheme => scheme.id).sort();
    const matched = matchSchemes(profile).map(result => result.scheme.id).sort();
    expect(suggested).toEqual(matched);
    expect(suggested).not.toContain('pm-svanidhi');
    expect(suggested).not.toContain('cegssc');
  });
});

describe('saved profiles', () => {
  it('restores user details, including explicit zero income and programme confirmations', () => {
    const profile = { ...basicProfile, annualFamilyIncome: 0, incomeProvided: true, traditionalTrade: 'Tailor', hasCasteCertificate: true };
    expect(restoreProfile(JSON.stringify(profile))).toMatchObject(profile);
  });

  it('recovers from invalid storage and rejects malformed eligibility fields', () => {
    for (const value of [null, '', '{bad', 'null', '[]', '42']) {
      expect(restoreProfile(value)).toEqual(createEmptyProfile());
    }
    const restored = restoreProfile(JSON.stringify({ age: 999, category: 'invalid', categoryProvided: true, estimatedCost: -50, projectType: 'constructor', projectTypeProvided: true, hasCasteCertificate: 'true' }));
    expect(isProfileReady(restored)).toBe(false);
    expect(restored.estimatedCost).toBe(0);
    expect(restored.projectTypeProvided).toBe(false);
    expect(restored.hasCasteCertificate).toBe(false);
  });
});
