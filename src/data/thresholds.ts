import type { StabilityTier } from "../types/borrower";
import type { LenderFoirTier, RateBandTier } from "../rules/creditRiskTier";

// Every constant here corresponds to a row in RULES.md. If you change a
// number here, update the matching row there with a dated note — this file
// and RULES.md must never drift apart.

/** RULES.md §2 — FOIR ceiling by stability tier. */
export const FOIR_CEILING: Record<StabilityTier, number> = {
  stable: 0.5,
  moderate: 0.4,
  volatile: 0.3,
};

/** RULES.md §2 — subsistence-floor safety buffer, as a fraction of net income. */
export const SUBSISTENCE_BUFFER_FRACTION = 0.1;

/** RULES.md §2 — safe-EMI reduction applied when a recent payment bounce is present. */
export const BOUNCE_SAFE_EMI_REDUCTION_FRACTION = 0.2;

/** RULES.md §7 — stress-scenario magnitudes. */
export const STRESS_INCOME_DROP_FRACTION = 0.2;
export const STRESS_RATE_RISE_PERCENTAGE_POINTS = 2;

/** RULES.md §3 — lender-side FOIR ceilings, by credit-risk tier.
 *  Typed against LenderFoirTier so a key mismatch is a compile error,
 *  not a silent NaN at runtime (this bit us once already — see git history). */
export const LENDER_FOIR_CEILING: Record<LenderFoirTier, number> = {
  good: 0.55, // score >= 750
  midOrUnknown: 0.45, // 650-749, or unknown
  weak: 0.35, // < 650, or recent bounce
};

/** RULES.md §3 — income-multiple cross-check for unsecured personal loans. */
export const INCOME_MULTIPLE_CAP = {
  salaried: { low: 10, high: 15 },
  selfEmployedDocumented: { low: 6, high: 8 },
};

/** RULES.md §3 — undocumented cash income haircut when no ITR/documented
 *  figure is provided (self-employed/informal). Flagged in RULES.md as one
 *  of the weakest-evidenced assumptions in the table. */
export const UNDOCUMENTED_INCOME_HAIRCUT_FRACTION = 0.5;

/** RULES.md §3 — loan-to-value assumptions for secured routing. */
export const LTV = {
  gold: 0.75,
  property: 0.55,
};

/**
 * RULES.md §4 — fair-rate bands by product and risk tier. All annual
 * percentages. Sourced bands are noted inline; unsourced ones are flagged
 * "judgement" in RULES.md itself, not repeated here to avoid drift between
 * two copies of the same caveat.
 */
export const RATE_BANDS: {
  personalLoan: Record<RateBandTier, { low: number; high: number }>;
  loanAgainstProperty: { documented: { low: number; high: number }; selfEmployedLessDocumented: { low: number; high: number } };
  goldLoan: { low: number; high: number };
  businessLoan: { low: number; high: number };
  twoWheelerLoan: { low: number; high: number };
} = {
  personalLoan: {
    good: { low: 10.5, high: 14.5 }, // score >= 750 — sourced
    mid: { low: 14, high: 18 }, // score 650-749
    unknown: { low: 15, high: 20 }, // score genuinely unknown — shifted up + widened, not assumed bad
    neverTaken: { low: 15, high: 21 }, // thin file, distinct from "unknown" per RULES.md §9
    weak: { low: 20, high: 28 }, // score < 650, or recent bounce
  },
  loanAgainstProperty: {
    documented: { low: 8.3, high: 12.75 }, // sourced
    selfEmployedLessDocumented: { low: 12, high: 16 },
  },
  goldLoan: { low: 8.5, high: 11.9 }, // sourced
  businessLoan: { low: 14, high: 24 }, // weakest-evidenced band, no clean source found
  twoWheelerLoan: { low: 10, high: 18 }, // weakest-evidenced band, no clean source found
};

/**
 * RULES.md §3 — reference tenure used ONLY for converting an income-based
 * EMI headroom into a comparable principal for sanction-sizing purposes.
 * This is an internal sizing assumption, not the tenure recommended to the
 * borrower (that's the separate RECOMMENDED_TENURE_MONTHS_BY_PRODUCT below).
 */
export const SANCTION_SIZING_REFERENCE_TENURE_MONTHS = 60;

/**
 * RULES.md §11 — default reference tenure by product, used both to convert
 * a safe EMI ceiling into a comparable principal (O2) and as the starting
 * point for the O4 tenure trade-off. The borrower can see EMI at other
 * tenures too — this is a starting default, not a constraint.
 */
export const RECOMMENDED_TENURE_MONTHS_BY_PRODUCT: Record<
  NonNullable<import("../types/borrower").LoanType>,
  number
> = {
  personal_loan: 60,
  gold_loan: 18,
  loan_against_property: 120,
  home_loan: 180,
  two_wheeler_loan: 36,
  business_loan: 60,
  not_sure: 60,
};

/** Tenure options shown for the O4 "approximate EMI at different tenures"
 *  comparison, in months. */
export const TENURE_COMPARISON_OPTIONS_MONTHS = [12, 24, 36, 48, 60];

/** RULES.md §11 — common Indian-lender convention capping tenure so that
 *  age + tenure(years) stays within a retirement-linked ceiling. Applied
 *  only when age is known; not enforced as a hard block, just a note. */
export const AGE_PLUS_TENURE_CEILING_YEARS = 60;

/** RULES.md §12 — an existing loan at or above this rate is treated as
 *  "high-cost/distress-priced" debt for verdict purposes (e.g. informal
 *  app-loans in the 30%+ range). */
export const HIGH_COST_EXISTING_DEBT_RATE_PERCENT = 24;

/** RULES.md §12 — requested amount must exceed the safe range's high end
 *  by more than this fraction before the verdict becomes "borrow less"
 *  rather than "borrow" (avoids flagging trivially small overshoots). */
export const BORROW_LESS_TRIGGER_FRACTION = 0.15;

/** RULES.md §9 — credit-card utilization at or above this level is treated
 *  as a real-world risk signal, pulling back an otherwise-good score. */
export const CREDIT_CARD_HIGH_UTILIZATION_THRESHOLD_PERCENT = 80;

/** RULES.md §2 — emergency-savings adjustment to the subsistence-floor
 *  buffer. A borrower with a real cash cushion needs less of a built-in
 *  safety margin; one with essentially no cushion needs more. */
export const EMERGENCY_SAVINGS_COMFORTABLE_MONTHS = 3;
export const EMERGENCY_SAVINGS_THIN_MONTHS = 1;
export const EMERGENCY_SAVINGS_BUFFER_MULTIPLIER = {
  comfortable: 0.5, // >= 3 months of savings: buffer is halved
  thin: 1.5, // < 1 month of savings: buffer increased by half
  default: 1, // between 1 and 3 months, or unknown: unchanged
};
