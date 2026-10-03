# SIH26092: research notes and product decisions

**Reviewed:** 3 October 2026  
**Project:** Scheme Lens

## What the problem is asking for

SIH26092 asks for a multilingual service that helps people discover the right concessional credit product, estimate repayments, and find an authorized channel partner. Its reproduced problem statement describes the NSFDC channel-finance model for Scheduled Caste beneficiaries: applicants do not apply directly to NSFDC, and applications move through State Channelizing Agencies, banks, and other channel partners. It calls out the difficulty of distinguishing small-project finance, larger term loans, and education loans.

The SIH listing available during this review was a public mirror, not an official SIH portal page. Scheme terms below were checked against the responsible government corporation's pages.

## Details confirmed with NSFDC

- NSFDC's FAQ, last updated 29 September 2026, says its loan assistance is for eligible SC applicants whose annual family income is at or below ₹5 lakh. It says direct applications are not entertained and points applicants to PM-SURAJ or authorized channel agencies.
- NSFDC describes a network of 102 channel partners across State Channelizing Agencies, public-sector banks, regional rural banks, NBFC-MFIs, cooperative banks, small finance banks, and other agencies.
- Published beneficiary rates vary by product and channel: the FAQ lists 6.5% for MFS, 15% for AMY, 8% for Term Loans, 13% or 15% for Udyam Nidhi depending on channel, and 6.5% for ELS. A single generic rate would mislead applicants.
- The same FAQ lists institution-level funding controls, including no overdues and full utilization of previously disbursed funds. It also describes additional RRB financial criteria. The public scheme pages do not provide a live, authenticated feed of each partner's current lending capacity or NPA position.
- NSFDC's ELS description caps support at ₹40 lakh or 90% of course fees, whichever is lower. That ₹40 lakh figure is a loan cap, not a course-cost cap.

## Product implication

The app already has a profile-based scheme finder, estimates, an agency directory, document preparation, and voice assistance. The new shortlist comparison lets a person compare up to three matches on support type, published project range, funding amount, beneficiary rate, repayment and moratorium terms, indicative EMI when available, income condition, reasons and caveats, and documents to prepare. Each column links to the scheme's official source. It explicitly labels guarantees and subsidies so they are not presented as cash loans. The comparison can be downloaded as a CSV preparation sheet for offline review or discussion with an agency.

The partner directory remains dated and source-linked. The app does not claim a partner has current funds or a safe NPA level without an authenticated status feed. That distinction is important to a credible SIH demo: it makes the current data gap visible instead of inventing a live routing signal.

## Sources

- [SIH26092 public mirror](https://sih2026.vuce.in/ps/SIH26092) — challenge description and expected solution.
- [NSFDC FAQ](https://nsfdc.nic.in/faqs) — income ceiling, application routes, partner network, scheme terms, and partner prudential criteria.
- [NSFDC scheme pages](https://nsfdc.nic.in/scheme) — scheme-specific product summaries.
- [NSFDC channel-partner directory](https://nsfdc.nic.in/storage/channel-partners/attachments/20260401_164458_Ip6UJm.pdf) — dated State Channelizing Agency listing.
- [myScheme About](https://www.myscheme.gov.in/about) and [myScheme FAQs](https://feedback.myscheme.gov.in/faqs) — national scheme-discovery and eligibility-questionnaire patterns, plus current multilingual and voice-chatbot capabilities.
- [Guidelines for Indian Government Websites: clear content](https://guidelines.india.gov.in/activity/crafting-clear-and-concise-content-writing-strategies-for-government-websites/) and [quick tips](https://guidelines.india.gov.in/quick-tips/) — citizen-focused language, short sentences, readability, and accessible contrast.
- [GIGW typography guidance](https://guidelines.india.gov.in/activity/the-impact-of-typography-on-web-design-a-comprehensive-guide-to-aesthetics-and-readability/) and [W3C line-spacing technique](https://www.w3.org/WAI/WCAG21/Techniques/css/C21) — consistent font choices and room between lines.

## Limits

The comparison is a planning view based on the app's reviewed catalogue. It is not an eligibility decision, credit sanction, live partner-funds check, or application submission. The official authority and the selected channel agency remain responsible for current criteria and final terms.

## Judge demo experience

The Lens tab opens on four sample journeys and their computed match preview. It now skips the timed tour, catalogue counts, and pitch section so people can reach examples and next steps sooner. The site uses a consistent sans-serif font, clearer line spacing, shorter citizen-focused text, and a small amount of Hinglish. Official category names and scheme limits stay intact where they affect eligibility.
