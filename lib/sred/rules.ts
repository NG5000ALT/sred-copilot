// SR&ED rules used by the pipeline. Every rate carries its source and whether a
// human checked it against the primary source. The UI badges unverified rates.

export type Rule<T> = { value: T; source: string; verified: boolean };

export const CRITERIA = [
  { key: "uncertainty", question: "Was there a scientific or technological uncertainty that could not be removed by standard practice?" },
  { key: "hypothesis", question: "Did the team formulate hypotheses to reduce that uncertainty?" },
  { key: "systematic", question: "Was the approach systematic (planned experiments, testing, analysis)?" },
  { key: "advancement", question: "Was the goal a technological advancement?" },
  { key: "records", question: "Were records kept as the work progressed?" },
] as const;
export type CriterionKey = (typeof CRITERIA)[number]["key"];
// The five-question policy (Northwest Hydraulic Consultants, 1998) was archived in 2021; CRA now frames
// eligibility as "How" and "Why" requirements. The s.248(1) definition is unchanged, so the five
// questions remain a fair reading aid for reviewers.
export const CRITERIA_SOURCE =
  "CRA 2021 Guidelines on the eligibility of work for SR&ED tax incentives (How/Why), and the archived five-question policy from Northwest Hydraulic Consultants v. The Queen: https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-policies-guidelines/guidelines-eligibility-work-sred-tax-incentives.html";

export const EXCLUSIONS: Rule<string[]> = {
  value: [
    "market research or sales promotion",
    "quality control or routine testing of materials, devices, products or processes",
    "research in the social sciences or the humanities",
    "prospecting, exploring or drilling for, or producing, minerals, petroleum or natural gas",
    "the commercial production of a new or improved material, device or product, or the commercial use of a new or improved process",
    "style changes",
    "routine data collection",
  ],
  source: "Income Tax Act s.248(1) definition of SR&ED, excluded work (a) to (h)",
  verified: false,
};

export const LINE_LIMITS = {
  "242": { words: 350, prompt: "What scientific or technological uncertainties did you attempt to overcome, ones standard practice could not remove?" },
  "244": { words: 700, prompt: "What work did you perform in the tax year to overcome the scientific or technological uncertainties described in line 242?" },
  "246": { words: 350, prompt: "What scientific or technological advancements did you achieve or attempt to achieve as a result of the work described in line 244?" },
} as const;
export type Line = keyof typeof LINE_LIMITS;
export const LINE_LIMITS_SOURCE: Rule<null> = {
  value: null,
  source: "CRA T661 project description: 242 max 350 words, 244 max 700, 246 max 350. https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/sred-claim/group-projects/project-description-t661.html",
  verified: true,
};

export const RATES = {
  proxyOverhead: { value: 0.55, source: "CRA Prescribed proxy amount policy, PPA = 55% of salary base: https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/prescribed-proxy-amount-policy.html", verified: true },
  contractorShare: { value: 0.8, source: "CRA Contract expenditures policy, 80% of arm's-length SR&ED contract payments qualify: https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/contract-expenditures-performed-on-behalf-a-claimant-policy.html", verified: true },
  itcEnhanced: { value: 0.35, source: "ITA s.127(10.1), enhanced refundable ITC for CCPCs", verified: false },
  itcGeneral: { value: 0.15, source: "CRA ITC policy, basic 15% rate above the limit (refundability not confirmed): https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/investment-tax-credit-policy.html", verified: false },
  expenditureLimit: { value: 6_000_000, source: "CRA ITC policy, $6M for CCPC tax years beginning after 2024-12-15 (Bill C-15, Royal Assent 2026-03-26); phases out at $15M-$75M prior-year taxable capital: https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program/investment-tax-credit-policy.html", verified: true },
} satisfies Record<string, Rule<number>>;

export const BANNED_PHRASES = [
  "revolutionary",
  "industry-first",
  "industry first",
  "unprecedented",
  "groundbreaking",
  "game-changing",
  "world-class",
  "cutting-edge",
  "best-in-class",
  "first-ever",
];

export const ROUTINE_KEYWORDS = ["migration", "migrate", "redesign", "upgrade", "integration", "qc", "quality control", "lims", "billing", "batch release"];

export const TAGS = ["uncertainty", "hypothesis", "experiment", "failure", "measurement", "result", "decision", "routine", "admin"] as const;
export type Tag = (typeof TAGS)[number];
