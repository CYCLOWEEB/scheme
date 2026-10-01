import { Scheme, UserProfile, SchemeMatchResult } from './types';
import { SCHEMES_DATABASE, VISHWAKARMA_TRADES } from './schemes-data';

export function calculateEmi(principal: number, annualRatePct: number, tenureYears: number, moratoriumMonths = 0): number {
  if (!Number.isFinite(principal) || !Number.isFinite(annualRatePct) || principal <= 0 || tenureYears <= 0) return 0;
  const monthlyRate = annualRatePct / (12 * 100);
  const totalMonths = Math.max(1, Math.round(tenureYears * 12));
  const graceMonths = Math.min(totalMonths - 1, Math.max(0, Math.round(moratoriumMonths)));
  const repaymentMonths = totalMonths - graceMonths;
  const repaymentPrincipal = principal * (1 + monthlyRate) ** graceMonths;
  if (monthlyRate === 0) return Math.round(repaymentPrincipal / repaymentMonths);
  const growth = Math.pow(1 + monthlyRate, repaymentMonths);
  return Math.round((repaymentPrincipal * monthlyRate * growth) / (growth - 1));
}

function isProfileComplete(profile: UserProfile): boolean {
  return Number.isFinite(profile.annualFamilyIncome)
    && profile.annualFamilyIncome >= 0
    && Number.isFinite(profile.estimatedCost)
    && profile.estimatedCost > 0
    && Number.isFinite(profile.ownContribution)
    && profile.ownContribution >= 0;
}

function projectCostFits(scheme: Scheme, cost: number): boolean {
  return cost >= (scheme.minProjectCost ?? 0)
    && (scheme.maxProjectCost === undefined || cost <= scheme.maxProjectCost);
}

export function matchSchemes(profile: UserProfile): SchemeMatchResult[] {
  if (!isProfileComplete(profile)
    || profile.projectTypeProvided !== true
    || (profile.category === 'General' && profile.categoryProvided !== true)) return [];

  const results: SchemeMatchResult[] = [];

  for (const scheme of SCHEMES_DATABASE) {
    // Keep the catalog scoped: never show a scheme as a match to a different target group or purpose.
    if (!scheme.targetBeneficiaries.includes(profile.category)) continue;
    if (!scheme.projectTypes.includes(profile.projectType)) continue;
    if (scheme.maxIncomeCeiling !== undefined
      && profile.incomeProvided !== false
      && profile.annualFamilyIncome > scheme.maxIncomeCeiling) continue;
    if (!projectCostFits(scheme, profile.estimatedCost)) continue;
    if (scheme.id === 'pmegp' && profile.projectType === 'term_loan_mfg' && profile.estimatedCost > 5000000) continue;
    if (scheme.id === 'pmegp'
      && ['term_loan_services', 'micro_business', 'transport_vehicle'].includes(profile.projectType)
      && profile.estimatedCost > 2000000) continue;
    if (scheme.id === 'pm-svanidhi' && profile.streetVendorStatus === 'no') continue;
    if ((scheme.id === 'cegssc' || scheme.id === 'sclcss') && profile.scStOwnedMseStatus === 'no') continue;
    if (scheme.id === 'pm-vishwakarma' && profile.age !== undefined && profile.age < 18) continue;
    if (scheme.id === 'pmegp' && profile.age !== undefined && profile.age <= 18) continue;

    const matchReasons: string[] = [];
    const caveats: string[] = [];
    let score = 100;

    const incomeMissing = scheme.maxIncomeCeiling !== undefined && profile.incomeProvided === false;
    const incomeFits = scheme.maxIncomeCeiling === undefined || profile.annualFamilyIncome <= scheme.maxIncomeCeiling;
    if (incomeMissing) {
      score -= 20;
      caveats.push('Annual family income has not been entered, so the published income ceiling cannot be checked.');
    } else if (incomeFits) {
      matchReasons.push(scheme.maxIncomeCeiling === undefined
        ? 'No family-income ceiling is listed in the cited scheme summary; confirm with the channel agency.'
        : `Reported family income is within the ₹${(scheme.maxIncomeCeiling / 100000).toFixed(1)} lakh ceiling.`);
    } else {
      score -= 40;
      caveats.push(`Reported family income is above the ₹${(scheme.maxIncomeCeiling! / 100000).toFixed(1)} lakh ceiling.`);
    }

    const hasPublishedCostRange = scheme.minProjectCost !== undefined || scheme.maxProjectCost !== undefined;
    matchReasons.push(hasPublishedCostRange
      ? 'Project purpose and cost are within the published scheme range.'
      : 'Project purpose fits the programme focus; confirm the scheme-specific project conditions.');

    let requirementConfirmed = true;
    if (scheme.id === 'nsfdc-els' && !profile.hasAdmission) {
      requirementConfirmed = false;
      score -= 25;
      caveats.push('The education scheme requires admission to an eligible, recognized full-time course; admission is not marked as confirmed.');
    }
    if (scheme.id === 'nskfdc-swrs' && !profile.hasSanitationWorkerEligibility) {
      requirementConfirmed = false;
      score -= 35;
      caveats.push('The sanitation scheme has a specific eligible-worker group; that status is not marked as confirmed.');
    }
    if (requirementConfirmed && scheme.id === 'nsfdc-els') {
      matchReasons.push('Admission to an eligible course is marked as confirmed.');
    }
    if (requirementConfirmed && scheme.id === 'nskfdc-swrs') {
      matchReasons.push('Eligible sanitation-worker status is marked as confirmed.');
    }

    if (scheme.id === 'pm-svanidhi') {
      if (profile.streetVendorStatus === 'yes') {
        matchReasons.push('Street-vendor status is marked as confirmed.');
      } else {
        score -= 30;
        caveats.push('This scheme is only for eligible street vendors; that status is not confirmed in the profile.');
      }
    }

    if (scheme.id === 'pm-vishwakarma') {
      if (profile.age === undefined) {
        score -= 10;
        caveats.push('PM Vishwakarma requires the artisan to be at least 18; age is not entered.');
      } else {
        matchReasons.push('Entered age meets the published minimum of 18 for PM Vishwakarma.');
      }
      if (profile.traditionalTrade && (VISHWAKARMA_TRADES as readonly string[]).includes(profile.traditionalTrade)) {
        matchReasons.push(`Selected trade (${profile.traditionalTrade}) appears on the PM Vishwakarma list; local verification still applies.`);
      } else {
        score -= 30;
        caveats.push('PM Vishwakarma is limited to 18 notified trades; choose a trade and confirm it against the official list.');
      }
    }

    if (scheme.id === 'pmegp') {
      if (profile.age === undefined) {
        score -= 10;
        caveats.push('PMEGP applicants must be over 18; age is not entered.');
      } else {
        matchReasons.push('Entered age is over 18, the published PMEGP minimum.');
      }
      if (profile.newEnterpriseStatus === 'yes') {
        matchReasons.push('A new enterprise is marked; PMEGP’s primary assistance is for new units.');
      } else {
        score -= 20;
        caveats.push(profile.newEnterpriseStatus === 'no'
          ? 'PMEGP’s primary assistance is for new units. Existing PMEGP/REGP/MUDRA units may have a separate upgrade route with additional conditions.'
          : 'Confirm whether this is a new unit; PMEGP’s primary assistance is for new enterprises.' );
      }
      const eighthGradeThresholdApplies = (profile.projectType === 'term_loan_mfg' && profile.estimatedCost > 1000000)
        || (['term_loan_services', 'micro_business', 'transport_vehicle'].includes(profile.projectType) && profile.estimatedCost > 500000);
      const sectorClassificationMayAffectEducationRule = ['green_business', 'traditional_trade'].includes(profile.projectType)
        && profile.estimatedCost > 500000;
      if (eighthGradeThresholdApplies || sectorClassificationMayAffectEducationRule) {
        if (profile.hasEighthGradeEducation !== true) {
          score -= 10;
          caveats.push(sectorClassificationMayAffectEducationRule
            ? 'PMEGP requires VIII standard education above the applicable threshold; the threshold depends on whether this activity is manufacturing or service/business.'
            : 'At least VIII standard education is required above the published manufacturing or service project-cost threshold.');
        }
      }
      if (['green_business', 'traditional_trade'].includes(profile.projectType) && profile.estimatedCost > 2000000) {
        score -= 10;
        caveats.push('For PMEGP, the project ceiling depends on whether the activity is classified as manufacturing (up to ₹50 lakh) or service/business (up to ₹20 lakh).');
      }
      if (!profile.projectLocationArea || profile.projectLocationArea === 'unknown') {
        score -= 5;
        caveats.push('The PMEGP subsidy rate depends on rural or urban project location and the applicant category.');
      }
    }

    if (scheme.id === 'pmmy') {
      if (profile.hasPreviousTarunRepayment) {
        matchReasons.push('Prior Tarun repayment is marked confirmed; the lender can assess access to Tarun Plus up to ₹20 lakh.');
      } else {
        caveats.push('Tarun Plus above ₹10 lakh is only for borrowers who successfully repaid a previous Tarun loan.');
      }
      caveats.push('PMMY does not publish one scheme-wide interest rate; the lending institution sets the rate and repayment terms.');
    }

    if (scheme.id === 'cegssc' || scheme.id === 'sclcss') {
      if (profile.scStOwnedMseStatus === 'yes') {
        matchReasons.push('SC/ST-majority enterprise ownership is marked confirmed; legal-form and registration rules still need verification.');
      } else {
        score -= 25;
        caveats.push('The programme requires an enterprise meeting SC/ST ownership rules; this is not confirmed in the profile.');
      }
    }

    if (scheme.id === 'nssh' && profile.scStOwnedMseStatus !== 'yes') {
      caveats.push('Some NSSH enterprise services require an SC/ST-owned MSE; the applicable support and ownership rules vary by sub-scheme.');
    }

    if (profile.category === 'SC' && !profile.hasCasteCertificate) {
      caveats.push('A valid SC certificate is required for NSFDC credit; obtain or confirm the certificate before applying.');
    }
    if ((scheme.id === 'cegssc' || scheme.id === 'sclcss') && !profile.hasCasteCertificate) {
      caveats.push('The programme requires proof of eligible SC/ST status and ownership; obtain or confirm the relevant certificate.');
    }
    if (scheme.maxIncomeCeiling !== undefined && !profile.hasIncomeCertificate) {
      caveats.push('Income proof will be requested by the channel agency.');
    }

    let loanAmount: number | undefined;
    let promoterContribution: number | undefined;
    let emi: number | undefined;
    if (scheme.maxLoanAmount !== undefined && scheme.maxLoanPercentage !== undefined) {
      loanAmount = Math.max(0, Math.min(scheme.maxLoanAmount, (profile.estimatedCost * scheme.maxLoanPercentage) / 100));
      promoterContribution = Math.max(0, profile.estimatedCost - loanAmount);
      if (profile.ownContribution < promoterContribution) {
        caveats.push(`Your entered contribution is ₹${(promoterContribution - profile.ownContribution).toLocaleString('en-IN')} below the amount not covered by the maximum scheme loan. Other funding may be possible; confirm with the agency.`);
      } else {
        matchReasons.push('Entered own contribution covers the part of project cost outside the maximum scheme loan.');
      }
      if (scheme.concessionalInterestRate !== undefined && scheme.repaymentTenureYears !== undefined) {
        emi = calculateEmi(loanAmount, scheme.concessionalInterestRate, scheme.repaymentTenureYears, scheme.moratoriumPeriodMonths ?? 0);
      }
    }
    results.push({
      scheme,
      matchScore: Math.max(0, score),
      matchReasons,
      caveats,
      ...(loanAmount === undefined ? {} : { recommendedLoanAmount: loanAmount }),
      ...(promoterContribution === undefined ? {} : { promoterContributionNeeded: promoterContribution }),
      ...(emi === undefined ? {} : { estimatedMonthlyEmi: emi }),
    });
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}
