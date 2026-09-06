// ============================================================================
// Borrower Copilot — core shared types
//
// WHY THIS FILE EXISTS FIRST:
// Both the rule engine (src/rules) and the question flow (src/data, src/pages)
// are built against these shapes. Nothing here contains lending judgement —
// it's the contract that keeps UI and rules from being tangled together.
// ============================================================================

// ---------------------------------------------------------------------------
// Borrower-provided facts
// ---------------------------------------------------------------------------

/** How the borrower earns money. Drives stability tier and which follow-up
 *  questions are shown — this is the single biggest branch point in the
 *  question tree. */
export type IncomeType = "salaried" | "self_employed_documented" | "informal_or_gig";

/** Loan purpose. "productive" vs "discretionary" is inferred from this list,
 *  not asked directly — asking a borrower to self-label as "discretionary"
 *  produces useless answers. */
export type LoanPurpose =
  | "wedding"
  | "medical"
  | "education"
  | "home_improvement"
  | "debt_consolidation"
  | "vehicle_for_income" // e.g. Anita's delivery scooter
  | "business_stock_or_equipment" // e.g. Ravi's second stock line
  | "travel_or_discretionary"
  | "other";

export type LoanType =
  | "personal_loan"
  | "gold_loan"
  | "loan_against_property"
  | "home_loan"
  | "two_wheeler_loan"
  | "business_loan"
  | "not_sure"; // triggers product-routing suggestion instead of a rate lookup

/** Credit score is modelled as a tagged union so "unknown" can never collapse
 *  into a number. This is a non-negotiable per the product brief: unknown is
 *  never zero, and it is never coerced into a default numeric score. */
export type CreditScoreInfo =
  | { status: "known"; score: number }
  | { status: "unknown" } // borrower genuinely doesn't know
  | { status: "never_taken_formal_credit" }; // distinct from "unknown" — no track record to be uncertain about

export type StabilityTier = "stable" | "moderate" | "volatile";

/** Every field beyond the first ~10 is optional by design — the question
 *  flow adds them incrementally, and the rule engine must degrade gracefully
 *  (wider ranges, lower confidence) when they're absent, never error. */
export interface BorrowerProfile {
  // --- Must questions (1–10) ---
  loanPurpose?: LoanPurpose;
  amountWanted?: number; // INR
  loanType?: LoanType;
  netMonthlyIncome?: number; // INR, take-home
  incomeType?: IncomeType;
  existingMonthlyEmiTotal?: number; // INR, sum of all current EMIs/card minimums
  essentialMonthlyExpenses?: number; // INR, rent + living costs, excluding existing EMI
  age?: number;
  creditScore?: CreditScoreInfo;
  tenureYearsInJobOrBusiness?: number;

  // --- Adaptive: self-employed / informal branch ---
  documentedAnnualIncome?: number; // e.g. ITR income — may be far below real cash flow (Ravi)
  incomeIsSeasonalOrVolatile?: boolean;

  // --- Adaptive: collateral branch ---
  hasCollateral?: boolean;
  collateralType?: "property" | "gold" | "vehicle" | "other";
  collateralEstimatedValue?: number; // INR
  collateralEncumbered?: boolean;

  // --- Adaptive: risk-history signal, asked of everyone once existing EMI > 0 or informal ---
  hadPaymentBounceRecently?: boolean; // last 6–12 months
  existingLoanRatesKnown?: number[]; // rates on current obligations, if known — flags "already paying distress pricing"

  // --- Adaptive: productive-purpose branch ---
  loanExpectedToGenerateIncome?: boolean;
  expectedMonthlyIncomeFromLoan?: number; // INR — capped-influence input, see calculateBorrowingVerdict rationale

  /** Optional, asked last if offered */
  emergencySavingsMonths?: number;
  hasCoApplicant?: boolean;
  coApplicantMonthlyIncome?: number;
  upcomingLargeExpense?: number; // INR, known one-off cost on the horizon
  hasCreditCard?: boolean;
  creditCardUtilizationPercent?: number; // only asked if borrower has a credit card
  lenderQuotedRate?: number; // if the borrower already has an offer — feeds the Negotiation Card directly
}

// ---------------------------------------------------------------------------
// Question schema — declarative, so "every question maps to an output" is
// a checkable property (see src/tests) rather than a hope.
// ---------------------------------------------------------------------------

export type OutputTag =
  | "verdict"
  | "sanction_amount"
  | "safe_amount"
  | "fair_rate"
  | "apr"
  | "emi_ceiling"
  | "stress_scenario"
  | "confidence"
  | "negotiation_card";

export interface Question<K extends keyof BorrowerProfile = keyof BorrowerProfile> {
  id: K;
  prompt: string;
  tier: "must" | "additional";
  /** Every question must declare at least one output it affects. A question
   *  with an empty array should not exist — enforced by a test, not just a
   *  convention. */
  affects: OutputTag[];
  /** Whether this question should be shown, given answers so far. Absence
   *  means "always applicable" (true for all must questions). */
  appliesIf?: (profile: BorrowerProfile) => boolean;
}

// ---------------------------------------------------------------------------
// Calculation output wrapper — every rule function returns this shape.
// No rule function may return a bare number for anything judgement-based.
// ---------------------------------------------------------------------------

export type ConfidenceLevel = "low" | "medium" | "high";

export interface Range {
  low: number;
  high: number;
}

export interface CalculationResult<T> {
  value: T;
  /** One or two plain-language sentences a borrower could read and
   *  understand — "why this number and not another." Mandatory. */
  rationale: string;
  confidence: ConfidenceLevel;
  /** Cites where a threshold/assumption came from, or says so plainly. */
  sourceOrJudgement: string;
  /** Set when a missing/unknown answer materially widened this result, so
   *  the UI can say "answer X to narrow this." */
  limitedBy?: string[];
}

export type BorrowingVerdict = "borrow" | "borrow_less" | "dont_borrow";
