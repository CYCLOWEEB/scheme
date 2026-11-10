import { describe, expect, it } from 'bun:test';
import { buildAiToolContext, preparedToolAnswer, isAiTool, selectAiProfile, selectedAiSchemes, validRepaymentSnapshot } from './ai-tools';
import { formatLocalizedINR } from './ui-copy';
import { createEmptyProfile } from './profile';
import { SCHEMES_DATABASE } from './schemes-data';

describe('AI guidance context', () => {
  it('keeps names and addresses out of screening requests without inventing confirmed details', () => {
    const profile = selectAiProfile({ ...createEmptyProfile(), name: 'Private name', state: 'Delhi', district: 'Private address' });
    expect(profile).not.toHaveProperty('name');
    expect(profile).not.toHaveProperty('state');
    expect(profile).not.toHaveProperty('district');
    expect(profile.categoryProvided).toBe(false);
    expect(profile.incomeProvided).toBe(false);
    expect(profile.projectTypeProvided).toBe(false);
  });

  it('limits scheme context to real catalogue entries', () => {
    expect(isAiTool('__proto__')).toBe(false);
    expect(isAiTool('summary')).toBe(true);
    expect(selectedAiSchemes(['invented-scheme', 'nsfdc-tls', 'nsfdc-tls', { id: 'pmegp' }]).map(scheme => scheme.id)).toEqual(['nsfdc-tls']);
    expect(selectedAiSchemes(SCHEMES_DATABASE.map(scheme => scheme.id))).toHaveLength(3);
    expect(buildAiToolContext({ tool: 'invented-tool' })).toBe('');
  });

  it('distinguishes self-reported readiness from document verification', () => {
    const scheme = SCHEMES_DATABASE[0];
    const context = buildAiToolContext({ tool: 'documents', schemeIds: [scheme.id], readyDocumentIndices: [0, 0, -1, 999, '1'] });
    expect(context).toContain(`Marked ready: ${scheme.mandatoryDocuments[0]}`);
    expect(context).toContain(`Not marked ready: ${scheme.mandatoryDocuments[1]}`);
    expect(context).toContain('no uploaded documents were analysed');
    expect(buildAiToolContext({ tool: 'documents', schemeIds: [scheme.id] })).toContain('Document readiness was not supplied');
  });

  it('does not accept malformed or incomplete repayment figures', () => {
    expect(validRepaymentSnapshot({ monthlyEmi: 1234 })).toBeUndefined();
    expect(validRepaymentSnapshot(null)).toBeUndefined();
    const snapshot = {
      projectCost: 100000, principal: 90000, annualRate: 8, graceMonths: 6,
      repaymentMonths: 54, monthlyEmi: 2070, totalInterest: 21780,
      totalPayment: 111780, ownContribution: 10000, otherFunding: 0, fundingGap: 0,
    };
    expect(validRepaymentSnapshot(snapshot)).toEqual(snapshot);
    expect(validRepaymentSnapshot({ ...snapshot, monthlyEmi: Infinity })).toBeUndefined();
    expect(validRepaymentSnapshot({ ...snapshot, annualRate: '8' })).toBeUndefined();
    expect(validRepaymentSnapshot({ ...snapshot, fundingGap: -1 })).toBeUndefined();
    const context = buildAiToolContext({ tool: 'repayment', schemeIds: ['nsfdc-tls'], repayment: snapshot });
    expect(context).toContain('not official loan terms');
    expect(context).toContain('"monthlyEmi":2070');
  });

  it('asks for missing details instead of fabricating recommendations in a prepared answer', () => {
    const preview = preparedToolAnswer({ tool: 'recommendations', profile: createEmptyProfile() }, 'en');
    expect(preview).toContain('Complete your profile');
    expect(preview).toContain('beneficiary category');
    expect(preview).not.toContain('₹');
  });

  it('updates the document preview when the user changes a checklist item', () => {
    const scheme = SCHEMES_DATABASE[0];
    const before = preparedToolAnswer({ tool: 'documents', schemeIds: [scheme.id], readyDocumentIndices: [] }, 'en');
    const after = preparedToolAnswer({ tool: 'documents', schemeIds: [scheme.id], readyDocumentIndices: [0] }, 'en');
    expect(before).toContain('No items marked ready yet.');
    expect(after).toContain(`You have this:\n• ${scheme.mandatoryDocuments[0]}`);
    expect(after).toContain(`Still needed:\n• ${scheme.mandatoryDocuments[1]}`);
    expect(after).toContain(`1 of ${scheme.mandatoryDocuments.length} papers ready`);
  });

  it('builds different summaries for selected schemes and retains every eligibility condition', () => {
    const scheme = SCHEMES_DATABASE.find(item => item.id === 'nsfdc-tls')!;
    const answer = preparedToolAnswer({ tool: 'summary', schemeIds: [scheme.id] }, 'en');
    expect(answer).toContain(scheme.name);
    expect(answer).toContain('Published loan limit: ₹45.00 Lakh');
    expect(answer).toContain('Annual interest rate: 8%');
    scheme.eligibilityBullets.forEach(condition => expect(answer).toContain(condition));
    expect(answer).not.toContain('AI guidance is unavailable');
    expect(preparedToolAnswer({ tool: 'summary', schemeIds: ['nsfdc-mfs'] }, 'en')).not.toBe(answer);
  });

  it('compares loan terms with other support types without inventing rates or loan amounts', () => {
    const supportScheme = SCHEMES_DATABASE.find(item => item.programType === 'business_support' && item.maxLoanAmount === undefined)!;
    const answer = preparedToolAnswer({ tool: 'comparison', schemeIds: ['nsfdc-tls', supportScheme.id] }, 'en');
    expect(answer).toContain('Support type: Direct loan');
    expect(answer).toContain('Support type: Business support');
    const supportAnswer = answer.split(`2. ${supportScheme.name}`)[1];
    expect(supportAnswer).not.toContain('Annual interest rate:');
    expect(supportAnswer).not.toContain('Published loan limit:');
    expect(supportAnswer).toContain('Documents to prepare:');
    expect(preparedToolAnswer({ tool: 'comparison', schemeIds: ['nsfdc-tls'] }, 'en')).toBe('Choose at least two schemes to compare.');
  });

  it('does not infer document readiness and recognises a completed checklist', () => {
    const scheme = SCHEMES_DATABASE[0];
    const unknown = preparedToolAnswer({ tool: 'documents', schemeIds: [scheme.id] }, 'en');
    expect(unknown).not.toContain('You have this:');
    const complete = preparedToolAnswer({ tool: 'documents', schemeIds: [scheme.id], readyDocumentIndices: scheme.mandatoryDocuments.map((_, index) => index) }, 'en');
    expect(complete).toContain('All checklist items are marked ready.');
    expect(complete).not.toContain('Gather the missing papers');
    expect(complete).toContain('Uploaded files have not been read or verified.');
  });

  it('uses the supplied repayment figures and responds to a remaining funding gap', () => {
    const repayment = {
      projectCost: 100000, principal: 90000, annualRate: 8, graceMonths: 6,
      repaymentMonths: 54, monthlyEmi: 2070, totalInterest: 21780,
      totalPayment: 111780, ownContribution: 5000, otherFunding: 0, fundingGap: 5000,
    };
    const answer = preparedToolAnswer({ tool: 'repayment', repayment }, 'en');
    expect(answer).toContain(`Estimated monthly payment: ${formatLocalizedINR(repayment.monthlyEmi, 'en')}`);
    expect(answer).toContain(`Total to repay: ${formatLocalizedINR(repayment.totalPayment, 'en')}`);
    expect(answer).toContain('Arrange the remaining funding');
    expect(preparedToolAnswer({ tool: 'repayment', repayment: { ...repayment, fundingGap: 0 } }, 'en')).toContain('no remaining funding gap');
    expect(preparedToolAnswer({ tool: 'repayment' }, 'en')).toContain('Open the repayment calculator');
  });

  it('localises prepared scheme answers and loading copy in Hindi', () => {
    const scheme = SCHEMES_DATABASE[0];
    const answer = preparedToolAnswer({ tool: 'summary', schemeIds: [scheme.id] }, 'hi');
    expect(answer).toContain(scheme.hindiName);
    expect(answer).toContain('अगला कदम');
    expect(answer).not.toContain('Next step');
  });
});
