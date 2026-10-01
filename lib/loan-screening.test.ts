import { describe, expect, it } from 'bun:test';
import { screenLoanProfile } from './loan-screening';
import type { UserProfile } from './types';

const completeScProfile: UserProfile = {
    name: 'Test Applicant',
    category: 'SC',
    categoryProvided: true,
  annualFamilyIncome: 140000,
  incomeProvided: true,
  state: 'Delhi',
  district: '',
  projectType: 'micro_business',
  projectTypeProvided: true,
  estimatedCost: 120000,
  ownContribution: 12000,
  hasCasteCertificate: true,
  hasIncomeCertificate: true,
  hasDPR: false,
};

describe('screenLoanProfile', () => {
  it('asks for the facts needed to screen an unfilled profile', () => {
    const screening = screenLoanProfile({
      category: 'General',
      categoryProvided: false,
      annualFamilyIncome: 0,
      estimatedCost: 0,
    });

    expect(screening.status).toBe('needs_details');
    expect(screening.missingDetails).toContain('beneficiary category');
    expect(screening.options).toHaveLength(0);
  });

  it('does not treat a default project choice or untouched zero income as confirmed', () => {
    const screening = screenLoanProfile({
      category: 'SC',
      annualFamilyIncome: 0,
      incomeProvided: false,
      projectType: 'micro_business',
      projectTypeProvided: false,
      estimatedCost: 0,
    });

    expect(screening.status).toBe('needs_details');
    expect(screening.missingDetails).toEqual([
      'intended project or course type',
      'estimated project or course cost',
      'annual family income',
    ]);
  });

  it('keeps the NSFDC micro-business options and adds relevant general programmes', () => {
    const screening = screenLoanProfile(completeScProfile);

    expect(screening.status).toBe('conditional_match');
    const optionNames = screening.options.map(option => option.schemeName);
    expect(optionNames).toContain('Micro Finance Scheme (MFS)');
    expect(optionNames).toContain('Aajeevika Micro-Finance Yojana (AMY)');
    expect(optionNames).toContain('Udyam Nidhi Yojana (UNY)');
    expect(optionNames).toContain('Prime Minister’s Employment Generation Programme');
    expect(optionNames).toContain('Pradhan Mantri MUDRA Yojana (PMMY / MUDRA)');
    expect(screening.options.find(option => option.schemeName.includes('Micro Finance Scheme'))?.estimatedMaximumLoan).toBe(108000);
    expect(screening.summary).toContain('Beneficiary category: SC');
    expect(screening.summary).toContain('Annual family income: ₹1,40,000');
  });

  it('does not recommend NSFDC loans above the published family-income ceiling but retains other programmes', () => {
    const screening = screenLoanProfile({
      ...completeScProfile,
      annualFamilyIncome: 600000,
    });

    expect(screening.options.some(option => option.schemeName.includes('Micro Finance Scheme'))).toBe(false);
    expect(screening.options.some(option => option.schemeName.includes('MUDRA'))).toBe(true);
    expect(screening.summary).toContain('NSFDC SC credit options are excluded');
  });

  it('does not declare an education loan match before admission is confirmed', () => {
    const screening = screenLoanProfile({
      ...completeScProfile,
      projectType: 'education_abroad',
      estimatedCost: 2500000,
      ownContribution: 250000,
      hasAdmission: false,
    });

    expect(screening.status).toBe('conditional_match');
    expect(screening.options).toHaveLength(1);
    expect(screening.options[0].estimatedMaximumLoan).toBe(2250000);
    expect(screening.options[0].conditionsToConfirm.join(' ')).toContain('admission');
  });

  it('does not apply NSFDC income rules to the sanitation-worker catalog entry', () => {
    const screening = screenLoanProfile({
      ...completeScProfile,
      category: 'SafaiKaramchari',
      annualFamilyIncome: 0,
      incomeProvided: false,
      projectType: 'sanitation_mech',
      estimatedCost: 1500000,
      ownContribution: 150000,
      hasSanitationWorkerEligibility: true,
    });

    expect(screening.status).toBe('potential_match');
    expect(screening.options[0].estimatedMaximumLoan).toBe(1350000);
  });

  it('screens inclusive programmes for OBC applicants without applying NSFDC category rules', () => {
    const screening = screenLoanProfile({ ...completeScProfile, category: 'OBC' });

    expect(screening.status).toBe('conditional_match');
    expect(screening.options.some(option => option.schemeName.includes('MUDRA'))).toBe(true);
    expect(screening.options.some(option => option.schemeName.includes('Micro Finance Scheme'))).toBe(false);
    expect(screening.summary).toContain('no-match result does not rule out other schemes');
  });

  it('shows PM SVANidhi only when street-vendor status is not explicitly ruled out', () => {
    const vendorScreening = screenLoanProfile({
      ...completeScProfile,
      streetVendorStatus: 'yes',
    });
    const noVendorScreening = screenLoanProfile({
      ...completeScProfile,
      streetVendorStatus: 'no',
    });

    expect(vendorScreening.options.some(option => option.schemeName === 'PM SVANidhi')).toBe(true);
    expect(vendorScreening.options.find(option => option.schemeName === 'PM SVANidhi')?.estimatedMaximumLoan).toBeUndefined();
    expect(noVendorScreening.options.some(option => option.schemeName === 'PM SVANidhi')).toBe(false);
  });

  it('matches artisan and SC/ST MSE programmes with the relevant project details', () => {
    const artisan = screenLoanProfile({
      ...completeScProfile,
      projectType: 'traditional_trade',
      estimatedCost: 80000,
      traditionalTrade: 'Carpenter',
    });
    const scStMse = screenLoanProfile({
      ...completeScProfile,
      projectType: 'term_loan_mfg',
      estimatedCost: 3000000,
      scStOwnedMseStatus: 'yes',
    });

    expect(artisan.options.some(option => option.schemeName === 'PM Vishwakarma')).toBe(true);
    expect(artisan.options.find(option => option.schemeName === 'PM Vishwakarma')?.estimatedMaximumLoan).toBeUndefined();
    expect(scStMse.options.some(option => option.schemeName === 'Special Credit Linked Capital Subsidy Scheme')).toBe(true);
    expect(scStMse.options.some(option => option.schemeName === 'Credit Enhancement Guarantee Scheme for Scheduled Castes')).toBe(true);
  });
});
