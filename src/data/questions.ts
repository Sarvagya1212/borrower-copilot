import type { Question } from "../types/borrower";

/**
 * The full question set. MUST questions (10) are sufficient on their own
 * for wide-band, low-confidence output on all four O1-O4 outputs. Every
 * ADDITIONAL question is gated by `appliesIf` (so salaried borrowers never
 * see self-employed questions, etc.) and every question — must or
 * additional — declares which outputs it `affects`. This is checked by an
 * automated test in src/tests/questions.test.ts: a question with an empty
 * `affects` array shouldn't exist, per the brief's "if it doesn't move a
 * number, cut it" rule.
 *
 * See docs/Flow.md for how this registry is consumed by getNextQuestion.
 */
export const QUESTIONS: Question[] = [
  // ---------------------------------------------------------------------
  // MUST questions — answering only these still produces all four outputs
  // ---------------------------------------------------------------------
  {
    id: "loanPurpose",
    prompt: "What's this loan for?",
    tier: "must",
    affects: ["verdict"],
  },
  {
    id: "amountWanted",
    prompt: "How much would you like to borrow?",
    tier: "must",
    affects: ["verdict", "negotiation_card"],
  },
  {
    id: "loanType",
    prompt: "What kind of loan are you considering? (Personal loan, gold loan, loan against property, home loan, two-wheeler loan, business loan — or not sure yet)",
    tier: "must",
    affects: ["fair_rate", "sanction_amount", "safe_amount", "emi_ceiling"],
  },
  {
    id: "incomeType",
    prompt: "How would you describe your income — salaried, self-employed with documented (ITR) income, or informal/gig income?",
    tier: "must",
    affects: ["safe_amount", "sanction_amount", "confidence"],
  },
  {
    id: "netMonthlyIncome",
    prompt: "What's your net (take-home) monthly income?",
    tier: "must",
    affects: ["safe_amount", "sanction_amount", "stress_scenario", "confidence"],
  },
  {
    id: "existingMonthlyEmiTotal",
    prompt: "What's the total of all your existing EMIs and card payments each month? (Enter 0 if none.)",
    tier: "must",
    affects: ["safe_amount", "sanction_amount"],
  },
  {
    id: "essentialMonthlyExpenses",
    prompt: "Roughly what are your essential monthly expenses — rent and everyday living costs (not counting existing EMIs)?",
    tier: "must",
    affects: ["safe_amount", "confidence"],
  },
  {
    id: "age",
    prompt: "What's your age?",
    tier: "must",
    affects: ["safe_amount", "emi_ceiling"],
  },
  {
    id: "creditScore",
    prompt: "Do you know your credit score? (Enter it, or tell us you don't know, or that you've never taken formal credit before.)",
    tier: "must",
    affects: ["fair_rate", "sanction_amount", "confidence"],
  },
  {
    id: "tenureYearsInJobOrBusiness",
    prompt: "How many years have you been at your current job, or running your business?",
    tier: "must",
    affects: ["confidence", "safe_amount"],
  },

  // ---------------------------------------------------------------------
  // ADDITIONAL questions — each gated, each moves a specific output
  // ---------------------------------------------------------------------
  {
    id: "hadPaymentBounceRecently",
    prompt: "Have any of your EMI or bill payments bounced in the last 6-12 months?",
    tier: "additional",
    affects: ["verdict", "safe_amount", "fair_rate", "sanction_amount", "confidence"],
  },
  {
    id: "documentedAnnualIncome",
    prompt: "Do you have documented annual income (e.g. from an ITR filing)? If so, roughly how much?",
    tier: "additional",
    affects: ["sanction_amount", "confidence"],
    appliesIf: (profile) =>
      profile.incomeType === "self_employed_documented" || profile.incomeType === "informal_or_gig",
  },
  {
    id: "incomeIsSeasonalOrVolatile",
    prompt: "Does your income vary a lot month to month, or is it fairly steady?",
    tier: "additional",
    affects: ["confidence", "safe_amount"],
    appliesIf: (profile) =>
      profile.incomeType === "self_employed_documented" || profile.incomeType === "informal_or_gig",
  },
  {
    id: "existingLoanRatesKnown",
    prompt: "Do you know the interest rate(s) on your existing loans or debts?",
    tier: "additional",
    affects: ["verdict"],
    appliesIf: (profile) => (profile.existingMonthlyEmiTotal ?? 0) > 0,
  },
  {
    id: "hasCollateral",
    prompt: "Do you own any unencumbered property or gold you could potentially offer as collateral?",
    tier: "additional",
    affects: ["sanction_amount", "negotiation_card"],
  },
  {
    id: "collateralType",
    prompt: "Is that collateral property or gold?",
    tier: "additional",
    affects: ["sanction_amount", "fair_rate", "negotiation_card"],
    appliesIf: (profile) => profile.hasCollateral === true,
  },
  {
    id: "collateralEstimatedValue",
    prompt: "Roughly what's that collateral worth?",
    tier: "additional",
    affects: ["sanction_amount", "negotiation_card"],
    appliesIf: (profile) => profile.hasCollateral === true,
  },
  {
    id: "collateralEncumbered",
    prompt: "Is there an existing loan already against that collateral?",
    tier: "additional",
    affects: ["sanction_amount"],
    appliesIf: (profile) => profile.hasCollateral === true,
  },
  {
    id: "loanExpectedToGenerateIncome",
    prompt: "Do you expect this loan to help generate income (e.g. more delivery runs, more stock to sell)?",
    tier: "additional",
    affects: ["verdict"],
    appliesIf: (profile) =>
      profile.loanPurpose === "vehicle_for_income" || profile.loanPurpose === "business_stock_or_equipment",
  },
  {
    id: "expectedMonthlyIncomeFromLoan",
    prompt: "Roughly how much extra income per month do you expect this to bring in?",
    tier: "additional",
    affects: ["verdict"],
    appliesIf: (profile) => profile.loanExpectedToGenerateIncome === true,
  },
  {
    id: "hasCreditCard",
    prompt: "Do you have a credit card?",
    tier: "additional",
    // Gating question — doesn't move a number itself, but avoids asking
    // the (real, output-moving) utilization question to someone with no
    // card at all. See the "affects" note in src/tests/questions.test.ts.
    affects: ["fair_rate"],
  },
  {
    id: "creditCardUtilizationPercent",
    prompt: "Roughly what percentage of your credit card limit(s) are you currently using?",
    tier: "additional",
    affects: ["fair_rate"],
    appliesIf: (profile) => profile.hasCreditCard === true,
  },
  {
    id: "emergencySavingsMonths",
    prompt: "If your income stopped, how many months of expenses could your savings cover?",
    tier: "additional",
    affects: ["safe_amount"],
  },
  {
    id: "hasCoApplicant",
    prompt: "Would you be applying with a co-applicant (e.g. spouse)?",
    tier: "additional",
    affects: ["safe_amount"],
  },
  {
    id: "coApplicantMonthlyIncome",
    prompt: "What's your co-applicant's net monthly income?",
    tier: "additional",
    affects: ["safe_amount"],
    appliesIf: (profile) => profile.hasCoApplicant === true,
  },
  {
    id: "upcomingLargeExpense",
    prompt: "Do you have any large one-off expense coming up in the next year (e.g. school admission, medical procedure)? Roughly how much?",
    tier: "additional",
    affects: ["safe_amount"],
  },
  {
    id: "lenderQuotedRate",
    prompt: "Has a lender already quoted you a rate? If so, what was it?",
    tier: "additional",
    affects: ["negotiation_card"],
  },
];
