import { Scheme, UserProfile, SchemeMatchResult } from './types';
import { SCHEMES_DATABASE } from './schemes-data';

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
  if (!isProfileComplete(profile)) return [];

  const results: SchemeMatchResult[] = [];

  for (const scheme of SCHEMES_DATABASE) {
    // Keep the catalog scoped: never show a scheme as a match to a different target group or purpose.
    if (!scheme.targetBeneficiaries.includes(profile.category)) continue;
    if (!scheme.projectTypes.includes(profile.projectType)) continue;

    const matchReasons: string[] = [];
    const caveats: string[] = [];
    let score = 100;

    const incomeFits = scheme.maxIncomeCeiling === undefined || profile.annualFamilyIncome <= scheme.maxIncomeCeiling;
    if (incomeFits) {
      matchReasons.push(scheme.maxIncomeCeiling === undefined
        ? 'No family-income ceiling is listed in the cited scheme summary; confirm with the channel agency.'
        : `Reported family income is within the ₹${(scheme.maxIncomeCeiling / 100000).toFixed(1)} lakh ceiling.`);
    } else {
      score -= 40;
      caveats.push(`Reported family income is above the ₹${(scheme.maxIncomeCeiling! / 100000).toFixed(1)} lakh ceiling.`);
    }

    const costFits = projectCostFits(scheme, profile.estimatedCost);
    if (costFits) {
      matchReasons.push('Project purpose and cost are within the published scheme range.');
    } else {
      score -= 35;
      if (scheme.minProjectCost && profile.estimatedCost < scheme.minProjectCost) {
        caveats.push(`This scheme is for projects above ₹${(scheme.minProjectCost / 100000).toFixed(2)} lakh.`);
      }
      if (scheme.maxProjectCost !== undefined && profile.estimatedCost > scheme.maxProjectCost) {
        caveats.push(`Project cost is above the published ₹${(scheme.maxProjectCost / 100000).toFixed(2)} lakh ceiling.`);
      }
    }

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

    if (profile.category === 'SC' && !profile.hasCasteCertificate) {
      caveats.push('A valid SC certificate is required for NSFDC credit; obtain or confirm the certificate before applying.');
    }
    if (scheme.maxIncomeCeiling !== undefined && !profile.hasIncomeCertificate) {
      caveats.push('Income proof will be requested by the channel agency.');
    }

    const maxLoanAllowed = Math.min(
      scheme.maxLoanAmount,
      (profile.estimatedCost * scheme.maxLoanPercentage) / 100,
    );
    const loanAmount = Math.max(0, maxLoanAllowed);
    const promoterContribution = Math.max(0, profile.estimatedCost - loanAmount);
    if (profile.ownContribution < promoterContribution) {
      caveats.push(`Your entered contribution is ₹${(promoterContribution - profile.ownContribution).toLocaleString('en-IN')} below the amount not covered by the maximum scheme loan. Other funding may be possible; confirm with the agency.`);
    } else {
      matchReasons.push('Entered own contribution covers the part of project cost outside the maximum scheme loan.');
    }

    const emi = calculateEmi(loanAmount, scheme.concessionalInterestRate, scheme.repaymentTenureYears, scheme.moratoriumPeriodMonths);
    results.push({
      scheme,
      matchScore: Math.max(0, score),
      matchReasons,
      caveats,
      recommendedLoanAmount: loanAmount,
      promoterContributionNeeded: promoterContribution,
      estimatedMonthlyEmi: emi,
    });
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}
