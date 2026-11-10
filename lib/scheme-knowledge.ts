import type { Scheme } from './types';
import type { AiTool } from './ai-tools';

// Every tool reads the same records, but only sends the fields it needs.
export function schemeKnowledgeFacts(scheme: Scheme, tool?: AiTool) {
  const common = {
    id: scheme.id, name: scheme.name, type: scheme.programType ?? 'direct_loan', overview: scheme.overview,
    conditions: scheme.eligibilityBullets, availability: scheme.availabilityNote,
    source: scheme.sourceUrl, reviewed: scheme.sourceReviewed,
  };
  if (tool === 'documents') return { ...common, documents: scheme.mandatoryDocuments };
  const financial = {
    minProjectCost: scheme.minProjectCost, maxProjectCost: scheme.maxProjectCost, maxLoanAmount: scheme.maxLoanAmount,
    maxLoanPercentage: scheme.maxLoanPercentage, annualRate: scheme.interestRateLabel ?? scheme.concessionalInterestRate,
    interestRateNote: scheme.interestRateNote, maxIncomeCeiling: scheme.maxIncomeCeiling,
    repayment: scheme.repaymentTerms, moratorium: scheme.moratoriumTerms,
    moratoriumMonths: scheme.moratoriumPeriodMonths, repaymentYears: scheme.repaymentTenureYears,
    financialHighlights: scheme.financialHighlights,
  };
  if (tool === 'repayment') return { ...common, ...financial };
  return { ...common, ...financial, benefits: scheme.keyBenefits, documents: scheme.mandatoryDocuments };
}
