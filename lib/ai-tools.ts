import { SCHEMES_DATABASE } from './schemes-data';
import { restoreProfile } from './profile';
import { screenLoanProfile } from './loan-screening';
import { formatLocalizedINR, localizeScheme, tr } from './ui-copy';
import type { UserProfile } from './types';

export const AI_TOOLS = {
  recommendations: {
    title: 'AI Recommendation System',
    description: 'Understand your matches and the conditions to check next.',
    action: 'Explain my matches',
    prompt: 'Explain the preliminary scheme matches for the entered profile. Give up to three relevant options, why each may fit, and the most useful next step. If details are missing, ask for them instead of choosing a winner.',
  },
  summary: {
    title: 'AI Scheme Summariser',
    description: 'Benefits, conditions, and next steps in a shorter read.',
    action: 'Generate summary',
    prompt: 'Summarise only the selected scheme in plain language: what it offers, who it is for, important conditions, and where to check the next step. Keep it under 180 words. Do not claim that the current user qualifies.',
  },
  comparison: {
    title: 'AI Comparison Assistant',
    description: 'Make sense of the differences between your options.',
    action: 'Compare with AI',
    prompt: 'Compare only the selected schemes. Explain differences in support type, published funding, rates, conditions, and documents. Explain the trade-offs without declaring a guaranteed best choice. Missing terms must remain unknown.',
  },
  documents: {
    title: 'AI Document Planner',
    description: 'Turn your scheme checklist into a clear preparation plan.',
    action: 'Plan my documents',
    prompt: 'Make a short document preparation plan for the selected scheme using its published checklist and the user-ticked items, if supplied. Separate items marked ready from items to prepare. If readiness is not supplied, do not assume anything is ready. Explain the next practical step. No files have been read, authenticated, or verified.',
  },
  repayment: {
    title: 'AI Repayment Explainer',
    description: 'Understand your monthly estimate and funding gap.',
    action: 'Explain my estimate',
    prompt: 'Explain the supplied calculator scenario: estimated monthly payment, interest during the pause, total repayment, and any funding gap. Use the supplied calculated amounts exactly; do not perform new calculations or confuse scenario assumptions with published terms. Do not assess affordability without income and expenses.',
  },
} as const;

export type AiTool = keyof typeof AI_TOOLS;

export interface RepaymentSnapshot {
  projectCost: number;
  principal: number;
  annualRate: number;
  graceMonths: number;
  repaymentMonths: number;
  monthlyEmi: number;
  totalInterest: number;
  totalPayment: number;
  ownContribution: number;
  otherFunding: number;
  fundingGap: number;
}

export interface AiToolInput {
  tool: AiTool;
  schemeIds?: string[];
  profile?: Partial<UserProfile>;
  readyDocumentIndices?: number[];
  repayment?: RepaymentSnapshot;
}

export function isAiTool(value: unknown): value is AiTool {
  return typeof value === 'string' && Object.hasOwn(AI_TOOLS, value);
}

export function selectAiProfile(profile: Partial<UserProfile>): Partial<UserProfile> {
  const restored = restoreProfile(JSON.stringify(profile));
  // Guidance needs screening fields, not the applicant's name, photo or address.
  const { name: _name, state: _state, district: _district, ...screeningFields } = restored;
  void _name;
  void _state;
  void _district;
  return screeningFields;
}

export function selectedAiSchemes(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  const selectedIds = [...new Set(ids.filter((id): id is string => typeof id === 'string'))].slice(0, 3);
  return selectedIds.flatMap(id => {
    const scheme = SCHEMES_DATABASE.find(item => item.id === id);
    return scheme ? [scheme] : [];
  });
}

export function validReadyIndices(value: unknown, documentCount: number): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.filter((index): index is number =>
    typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < documentCount,
  ))];
}

export function validRepaymentSnapshot(value: unknown): RepaymentSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const data = value as Record<string, unknown>;
  const keys: (keyof RepaymentSnapshot)[] = [
    'projectCost', 'principal', 'annualRate', 'graceMonths', 'repaymentMonths',
    'monthlyEmi', 'totalInterest', 'totalPayment', 'ownContribution', 'otherFunding', 'fundingGap',
  ];
  if (keys.some(key => typeof data[key] !== 'number' || !Number.isFinite(data[key]) || Number(data[key]) < 0 || Number(data[key]) > 1e12)) return undefined;
  if (Number(data.annualRate) > 100 || Number(data.graceMonths) > 600
    || Number(data.repaymentMonths) < 1 || Number(data.repaymentMonths) > 1200) return undefined;
  return Object.fromEntries(keys.map(key => [key, data[key]])) as unknown as RepaymentSnapshot;
}

export function buildAiToolContext(body: Record<string, unknown>): string {
  if (!isAiTool(body.tool)) return '';
  const schemes = selectedAiSchemes(body.schemeIds);
  const lines = [
    `Requested tool: ${AI_TOOLS[body.tool].title}.`,
    AI_TOOLS[body.tool].prompt,
    'Use short plain-text paragraphs or bullets. Do not use Markdown headings or links in the answer; the interface displays the official source links separately.',
    `Only discuss these selected schemes for scheme-specific tools: ${schemes.map(scheme => scheme.name).join('; ') || 'none selected'}.`,
  ];
  if (body.tool === 'documents' && schemes[0]) {
    const ready = validReadyIndices(body.readyDocumentIndices, schemes[0].mandatoryDocuments.length);
    if (ready) {
      lines.push('The following readiness is self-reported; no uploaded documents were analysed:');
      schemes[0].mandatoryDocuments.forEach((document, index) => {
        lines.push(`${ready.includes(index) ? 'Marked ready' : 'Not marked ready'}: ${document}.`);
      });
    } else lines.push('Document readiness was not supplied. Do not infer it from profile flags.');
  }
  if (body.tool === 'repayment') {
    const snapshot = validRepaymentSnapshot(body.repayment);
    lines.push(snapshot
      ? `User-entered calculator scenario and calculated estimates (not official loan terms): ${JSON.stringify(snapshot)}.`
      : 'No valid calculator snapshot was supplied. Ask the user to open the repayment calculator; do not invent an EMI.');
  }
  return lines.join('\n');
}

// Prepared responses use the local catalogue and current inputs; no model or service is called.
export function preparedToolAnswer(input: AiToolInput, language: string): string {
  const t = (text: string) => tr(language, text);
  const schemes = selectedAiSchemes(input.schemeIds);
  const money = (amount: number) => formatLocalizedINR(amount, language);
  if (input.tool === 'recommendations') {
    const screen = screenLoanProfile(input.profile);
    if (screen.missingDetails.length) {
      return `${t('Complete your profile to explain your matches.')}\n${t('Details still needed:')} ${screen.missingDetails.map(t).join(', ')}.`;
    }
    if (!screen.options.length) return t('No match in this list yet. Rules can vary by scheme and location.');
    return [
      t('These options match the beneficiary group, purpose and cost you entered. Check the remaining conditions before applying.'),
      ...screen.options.slice(0, 3).map((option, index) => {
        const scheme = SCHEMES_DATABASE.find(item => item.name === option.schemeName);
        return [
          `${index + 1}. ${scheme ? localizeScheme(scheme, language).name : option.schemeName}`,
          scheme ? t(scheme.overview) : '',
          option.estimatedMaximumLoan === undefined ? '' : `${t('Possible support')}: ${money(option.estimatedMaximumLoan)}`,
          ...option.supportDetails.slice(0, 2).map(detail => `• ${t(detail)}`),
          ...option.conditionsToConfirm.map(condition => `${t('Check:')} ${t(condition)}`),
        ].filter(Boolean).join('\n');
      }),
      `${t('Next step')}: ${t('Compare the terms, prepare the listed documents and contact the authorised agency for your preferred option.')}`,
    ].join('\n\n');
  }
  if (input.tool === 'repayment') {
    const snapshot = validRepaymentSnapshot(input.repayment);
    if (!snapshot) return t('Open the repayment calculator to explore an estimate.');
    return [
      t('Here is how your repayment estimate breaks down.'),
      '',
      `${t('Project cost')}: ${money(snapshot.projectCost)}`,
      `${t('Estimated loan')}: ${money(snapshot.principal)}`,
      `${t('Estimated monthly payment')}: ${money(snapshot.monthlyEmi)}`,
      `${t('Annual interest rate')}: ${snapshot.annualRate}%`,
      `${t('Payment pause')}: ${snapshot.graceMonths} ${t('months')}`,
      `${t('Monthly payments')}: ${snapshot.repaymentMonths}`,
      `${t('Total interest estimate')}: ${money(snapshot.totalInterest)}`,
      `${t('Total to repay')}: ${money(snapshot.totalPayment)}`,
      '',
      `${t('Your contribution')}: ${money(snapshot.ownContribution)}`,
      `${t('Other funding')}: ${money(snapshot.otherFunding)}`,
      `${t('Still to arrange')}: ${money(snapshot.fundingGap)}`,
      t(snapshot.fundingGap > 0
        ? 'Arrange the remaining funding before committing to the project. Compare the monthly payment with your income and regular expenses.'
        : 'This scenario has no remaining funding gap. Compare the monthly payment with your income and regular expenses.'),
      '',
      t('This estimate adds interest each month during the pause. Your lender may use different dates or rules. Ask for the final payment plan.'),
      `${t('Next step')}: ${t('Ask the lender to confirm the rate, fees, payment dates and final repayment schedule.')}`,
    ].join('\n');
  }
  if (!schemes.length) return t('Choose a scheme to explore its details.');
  if (input.tool === 'documents') {
    const scheme = localizeScheme(schemes[0], language);
    const ready = validReadyIndices(input.readyDocumentIndices, scheme.mandatoryDocuments.length);
    const remaining = scheme.mandatoryDocuments.filter((_, index) => !ready?.includes(index));
    return [
      scheme.name,
      '',
      ...(ready === undefined ? [
        t('Start with this document checklist. Mark items ready in your document planner as you prepare them.'),
        ...scheme.mandatoryDocuments.map(document => `• ${document}`),
      ] : [
        t(`${ready.length} of ${scheme.mandatoryDocuments.length} papers ready`),
        '',
        `${t('You have this')}:`,
        ...(ready.length ? ready.map(index => `• ${scheme.mandatoryDocuments[index]}`) : [t('No items marked ready yet.')]),
        '',
        `${t('Still needed')}:`,
        ...(remaining.length ? remaining.map(document => `• ${document}`) : [t('All checklist items are marked ready. Review them before submitting.')]),
      ]),
      '',
      `${t('Next step')}: ${t(remaining.length
        ? 'Gather the missing papers, check that names and details match, and keep clear copies ready.'
        : 'Review the completed checklist with the agency before submitting your application.')}`,
      t('Ask the agency for its latest list.'),
      t('Readiness is based on your checklist. Uploaded files have not been read or verified.'),
    ].join('\n');
  }

  const supportTypes = {
    direct_loan: 'Direct loan',
    credit_guarantee: 'Credit guarantee',
    credit_linked_subsidy: 'Credit-linked subsidy',
    business_support: 'Business support',
  };
  const schemeTerms = (item: typeof schemes[number]) => {
    const scheme = localizeScheme(item, language);
    const isLoan = (scheme.programType ?? 'direct_loan') === 'direct_loan';
    return [
      `${t('Support type')}: ${t(supportTypes[scheme.programType ?? 'direct_loan'])}`,
      scheme.minProjectCost === undefined ? '' : `${t('Minimum project cost')}: ${money(scheme.minProjectCost)}`,
      scheme.maxProjectCost === undefined ? '' : `${t('Published project cost limit')}: ${money(scheme.maxProjectCost)}`,
      scheme.maxLoanAmount === undefined ? '' : `${t('Published loan limit')}: ${money(scheme.maxLoanAmount)}`,
      scheme.maxLoanPercentage === undefined ? '' : `${t('Maximum share of project cost')}: ${scheme.maxLoanPercentage}%`,
      ...((scheme.financialHighlights ?? []).map(item => `• ${item.label}: ${item.value}${item.note ? ` (${item.note})` : ''}`)),
      isLoan ? `${t('Annual interest rate')}: ${scheme.interestRateLabel ?? (scheme.concessionalInterestRate === undefined ? t('Set by the lender; confirm the quoted rate.') : `${scheme.concessionalInterestRate}%`)}` : '',
      scheme.interestRateNote ?? '',
      scheme.repaymentTerms ? `${t('Repayment')}: ${scheme.repaymentTerms}` : '',
    ].filter(Boolean);
  };

  if (input.tool === 'comparison') {
    if (schemes.length < 2) return t('Choose at least two schemes to compare.');
    const checklists = schemes.map(scheme => localizeScheme(scheme, language).mandatoryDocuments);
    const sharedDocuments = checklists[0].filter(document => checklists.every(checklist => checklist.includes(document)));
    return [
      t('Compare the support, costs and conditions side by side before choosing your next step.'),
      ...schemes.map((item, index) => {
        const scheme = localizeScheme(item, language);
        return [
          `${index + 1}. ${scheme.name}`,
          scheme.overview,
          ...schemeTerms(item),
          `${t('Eligibility')}:`,
          ...scheme.eligibilityBullets.map(condition => `• ${condition}`),
          `${t('Documents to prepare')}: ${scheme.mandatoryDocuments.join('; ')}`,
          scheme.availabilityNote ?? '',
        ].filter(Boolean).join('\n');
      }),
      ...(sharedDocuments.length ? [`${t('Documents in common')}:\n${sharedDocuments.map(document => `• ${document}`).join('\n')}`] : []),
      `${t('Next step')}: ${t('Start with the option whose purpose and eligibility fit your profile. Compare the final lender terms and document requirements with the agency.')}`,
      t('A guarantee, subsidy or support service is different from a direct loan. Missing terms must be confirmed with the agency.'),
    ].join('\n\n');
  }

  return schemes.map(item => {
    const scheme = localizeScheme(item, language);
    return [
      scheme.name,
      '',
      scheme.overview,
      ...schemeTerms(item),
      '',
      `${t('Key benefits')}:`,
      ...scheme.keyBenefits.map(benefit => `• ${benefit}`),
      '',
      `${t('Eligibility')}:`,
      ...scheme.eligibilityBullets.map(condition => `• ${condition}`),
      scheme.availabilityNote ?? '',
      '',
      `${t('Next step')}: ${t('Check the eligibility conditions, prepare the scheme checklist and contact the authorised agency using the official source below.')}`,
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}
