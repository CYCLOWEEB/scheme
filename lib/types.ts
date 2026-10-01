export type BeneficiaryCategory = 'SC' | 'ST' | 'OBC' | 'SafaiKaramchari' | 'Minority' | 'General';

export type ProjectType = 
  | 'micro_business'      // Petty shops, street vendors, tailoring, small kiosks
  | 'term_loan_services'  // Service sector: clinics, repair centers, printing, cafes
  | 'term_loan_mfg'       // Manufacturing, agro-processing, fabrication, handicrafts
  | 'transport_vehicle'   // Commercial e-rickshaw, auto, small goods carrier
  | 'green_business'      // Solar rooftop, biogas, eco-friendly recycling
  | 'sanitation_mech'     // Suction machines, sewer cleaning, waste transport
  | 'education_domestic'  // Higher education in India
  | 'education_abroad'    // Higher education overseas
  | 'traditional_trade';  // One of the PM Vishwakarma artisan trades

export type SchemeProgramType = 'direct_loan' | 'credit_guarantee' | 'credit_linked_subsidy' | 'business_support';
export type ProfileConfirmation = 'yes' | 'no' | 'unknown';

export interface Scheme {
  id: string;
  code: string;
  name: string;
  hindiName: string;
  corporation: 'NSFDC' | 'NSKFDC' | 'NBCFDC' | 'Ministry of Social Justice' | 'Ministry of MSME' | 'Department of Financial Services' | 'Ministry of Housing and Urban Affairs';
  programType?: SchemeProgramType; // older catalog entries default to direct loan
  categoryTag: string;
  targetBeneficiaries: BeneficiaryCategory[];
  projectTypes: ProjectType[];
  maxProjectCost?: number; // in INR; omitted if the scheme publishes no project-cost ceiling
  minProjectCost?: number; // in INR
  maxLoanPercentage?: number; // published share of project cost, when specified
  maxLoanAmount?: number; // direct-loan ceiling, when specified
  concessionalInterestRate?: number; // published beneficiary rate, when specified
  moratoriumPeriodMonths?: number; // e.g. 6 to 12 months
  repaymentTenureYears?: number; // e.g. 5 to 10 years
  maxIncomeCeiling?: number; // in INR; omitted if the scheme does not publish one
  interestRateLabel?: string;
  interestRateNote?: string;
  sourceUrl: string;
  sourceReviewed: string;
  repaymentTerms?: string;
  moratoriumTerms?: string;
  financialHighlights?: { label: string; value: string; note?: string }[];
  availabilityNote?: string;
  channelPartnerTypes: ('SCA' | 'PSB' | 'RRB' | 'NBFC_MFI' | 'COOP' | 'SFB')[];
  overview: string;
  keyBenefits: string[];
  mandatoryDocuments: string[];
  eligibilityBullets: string[];
}

export interface UserProfile {
  name: string;
  category: BeneficiaryCategory;
  categoryProvided?: boolean;
  annualFamilyIncome: number;
  incomeProvided?: boolean;
  state: string;
  district: string;
  projectType: ProjectType;
  projectTypeProvided?: boolean;
  estimatedCost: number;
  ownContribution: number;
  hasCasteCertificate: boolean;
  hasIncomeCertificate: boolean;
  hasDPR: boolean;
  hasAdmission?: boolean;
  hasSanitationWorkerEligibility?: boolean;
  age?: number;
  newEnterpriseStatus?: ProfileConfirmation;
  streetVendorStatus?: ProfileConfirmation;
  scStOwnedMseStatus?: ProfileConfirmation;
  traditionalTrade?: string;
  hasPreviousTarunRepayment?: boolean;
  projectLocationArea?: 'rural' | 'urban' | 'unknown';
  hasEighthGradeEducation?: boolean;
}

export interface SchemeMatchResult {
  scheme: Scheme;
  matchScore: number; // 0 to 100
  matchReasons: string[];
  caveats: string[];
  recommendedLoanAmount?: number;
  promoterContributionNeeded?: number;
  estimatedMonthlyEmi?: number;
}
