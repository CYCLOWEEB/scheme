export type BeneficiaryCategory = 'SC' | 'ST' | 'OBC' | 'SafaiKaramchari' | 'Minority' | 'General';

export type ProjectType = 
  | 'micro_business'      // Petty shops, street vendors, tailoring, small kiosks
  | 'term_loan_services'  // Service sector: clinics, repair centers, printing, cafes
  | 'term_loan_mfg'       // Manufacturing, agro-processing, fabrication, handicrafts
  | 'transport_vehicle'   // Commercial e-rickshaw, auto, small goods carrier
  | 'green_business'      // Solar rooftop, biogas, eco-friendly recycling
  | 'sanitation_mech'     // Suction machines, sewer cleaning, waste transport
  | 'education_domestic'  // Higher education in India
  | 'education_abroad';   // Higher education overseas

export interface Scheme {
  id: string;
  code: string;
  name: string;
  hindiName: string;
  corporation: 'NSFDC' | 'NSKFDC' | 'NBCFDC' | 'Ministry of Social Justice';
  categoryTag: string;
  targetBeneficiaries: BeneficiaryCategory[];
  projectTypes: ProjectType[];
  maxProjectCost?: number; // in INR; omitted if the scheme publishes no project-cost ceiling
  minProjectCost?: number; // in INR
  maxLoanPercentage: number; // e.g. 90%
  maxLoanAmount: number; // in INR
  concessionalInterestRate: number; // e.g. 6.5% p.a.
  moratoriumPeriodMonths: number; // e.g. 6 to 12 months
  repaymentTenureYears: number; // e.g. 5 to 10 years
  maxIncomeCeiling?: number; // in INR; omitted if the scheme does not publish one
  interestRateLabel?: string;
  interestRateNote?: string;
  sourceUrl: string;
  sourceReviewed: string;
  repaymentTerms?: string;
  moratoriumTerms?: string;
  channelPartnerTypes: ('SCA' | 'PSB' | 'RRB' | 'NBFC_MFI' | 'COOP' | 'SFB')[];
  overview: string;
  keyBenefits: string[];
  mandatoryDocuments: string[];
  eligibilityBullets: string[];
}

export interface UserProfile {
  name: string;
  category: BeneficiaryCategory;
  annualFamilyIncome: number;
  state: string;
  district: string;
  projectType: ProjectType;
  estimatedCost: number;
  ownContribution: number;
  hasCasteCertificate: boolean;
  hasIncomeCertificate: boolean;
  hasDPR: boolean;
  hasAdmission?: boolean;
  hasSanitationWorkerEligibility?: boolean;
}

export interface SchemeMatchResult {
  scheme: Scheme;
  matchScore: number; // 0 to 100
  matchReasons: string[];
  caveats: string[];
  recommendedLoanAmount: number;
  promoterContributionNeeded: number;
  estimatedMonthlyEmi: number;
}
