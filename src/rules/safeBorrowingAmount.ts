import type { BorrowerProfile, CalculationResult, Range } from "../types/borrower";
import { RECOMMENDED_TENURE_MONTHS_BY_PRODUCT } from "../data/thresholds";
import { principalFromEMI } from "../calculations/emi";
import { combineConfidence } from "./confidenceUtils";
import { resolveTenureMonths } from "./tenure";
import { formatINR } from "../utils/formatCurrency";

/**
 * O2's second number — "the borrower's safe/affordable amount" — converted
 * from the safe EMI ceiling (calculateAffordability's output) into a
 * principal, using the fair-rate BAND (not a single assumed rate) so the
 * uncertainty in the rate carries through to the amount rather than being
 * hidden.
 *
 * A lower rate supports a larger principal at the same EMI, so:
 *   principal at the low end of the fair-rate band -> the HIGH end of the amount range
 *   principal at the high end of the fair-rate band -> the LOW end of the amount range
 *
 * Kept as a fully separate function from calculateLikelySanction (Decision D1)
 * even though the arithmetic shape is similar — the inputs (safe EMI, fair
 * rate) are never the lender-side inputs.
 *
 * This is the UNSECURED path, sized against whatever loanType the borrower
 * stated (or "not_sure"). See calculateSecuredSafeBorrowingAmount below for
 * the parallel secured-collateral path, and Decision D5 for how the two are
 * compared in getBorrowingVerdict.
 */
export function calculateSafeBorrowingAmount(
  profile: BorrowerProfile,
  safeEmi: CalculationResult<number>,
  fairRate: CalculationResult<Range>,
): CalculationResult<Range> & { tenureMonths: number } {
  const baseTenureMonths = RECOMMENDED_TENURE_MONTHS_BY_PRODUCT[profile.loanType ?? "not_sure"];
  const { tenureMonths, ageNote } = resolveTenureMonths(profile, baseTenureMonths);

  const confidence = combineConfidence(safeEmi.confidence, fairRate.confidence);
  const limitedBy = Array.from(new Set([...(safeEmi.limitedBy ?? []), ...(fairRate.limitedBy ?? [])]));

  if (safeEmi.value <= 0) {
    return {
      value: { low: 0, high: 0 },
      rationale:
        "Your safe EMI ceiling is ₹0 right now, so there isn't an unsecured borrowing amount we can responsibly recommend at this time.",
      confidence,
      sourceOrJudgement: "My judgement — direct consequence of the safe-EMI calculation.",
      ...(limitedBy.length > 0 ? { limitedBy } : {}),
      tenureMonths,
    };
  }

  const principalAtLowRate = principalFromEMI(safeEmi.value, fairRate.value.low, tenureMonths);
  const principalAtHighRate = principalFromEMI(safeEmi.value, fairRate.value.high, tenureMonths);

  const range: Range = {
    low: Math.round(principalAtHighRate),
    high: Math.round(principalAtLowRate),
  };

  const rationale = `At a safe EMI of ${formatINR(safeEmi.value)}/month over ${tenureMonths} months${ageNote}, and a fair rate of ${fairRate.value.low}%–${fairRate.value.high}%, you could safely borrow roughly ${formatINR(
    range.low,
  )}–${formatINR(range.high)} unsecured. This is the number we'd recommend using, even if a lender offers to sanction more.`;

  return {
    value: range,
    rationale,
    confidence,
    sourceOrJudgement: "Derived arithmetically from calculateAffordability and calculateFairRate — see RULES.md §2, §4, §11.",
    ...(limitedBy.length > 0 ? { limitedBy } : {}),
    tenureMonths,
  };
}

export interface SecuredSafeBorrowingAmount extends CalculationResult<Range> {
  tenureMonths: number;
  collateralType: "gold" | "property";
}

/**
 * The secured-collateral parallel to calculateSafeBorrowingAmount. Two
 * independent ceilings, the LOWER wins per bound (same min()-of-two-methods
 * pattern as calculateLikelySanction):
 *
 * 1. What the borrower can safely SERVICE: the safe-EMI ceiling converted
 *    to a principal at the secured product's (lower) fair-rate band.
 * 2. What the collateral can SUPPORT: the loan-to-value ceiling already
 *    computed by calculateLikelySanction's securedAlternative.
 *
 * Without this second constraint, a large loan-to-value ceiling could
 * imply a principal the borrower can't actually service — the LTV number
 * alone is a lender-side sanction ceiling, not a safety check (Decision D1
 * applies here too, just within the secured path).
 */
export function calculateSecuredSafeBorrowingAmount(
  profile: BorrowerProfile,
  safeEmi: CalculationResult<number>,
  securedFairRate: CalculationResult<Range>,
  ltvCeiling: number,
  collateralType: "gold" | "property",
): SecuredSafeBorrowingAmount {
  const loanType = collateralType === "property" ? "loan_against_property" : "gold_loan";
  const baseTenureMonths = RECOMMENDED_TENURE_MONTHS_BY_PRODUCT[loanType];
  const { tenureMonths, ageNote } = resolveTenureMonths(profile, baseTenureMonths);

  const confidence = combineConfidence(safeEmi.confidence, securedFairRate.confidence);
  const limitedBy = Array.from(new Set([...(safeEmi.limitedBy ?? []), ...(securedFairRate.limitedBy ?? [])]));

  if (safeEmi.value <= 0) {
    return {
      value: { low: 0, high: 0 },
      rationale: "Your safe EMI ceiling is ₹0 right now, so we can't recommend a secured borrowing amount either.",
      confidence,
      sourceOrJudgement: "My judgement",
      ...(limitedBy.length > 0 ? { limitedBy } : {}),
      tenureMonths,
      collateralType,
    };
  }

  const principalAtLowRate = principalFromEMI(safeEmi.value, securedFairRate.value.low, tenureMonths);
  const principalAtHighRate = principalFromEMI(safeEmi.value, securedFairRate.value.high, tenureMonths);

  // The EMI-based figure is capped by what the collateral can support (LTV).
  const range: Range = {
    low: Math.round(Math.min(principalAtHighRate, ltvCeiling)),
    high: Math.round(Math.min(principalAtLowRate, ltvCeiling)),
  };
  if (range.high < range.low) range.high = range.low;

  const boundByLtv = range.high === Math.round(ltvCeiling) && ltvCeiling < principalAtLowRate;
  const productLabel = collateralType === "property" ? "loan against property" : "gold loan";

  const rationale = boundByLtv
    ? `Using your ${collateralType} as collateral, a ${productLabel} could safely go up to roughly ${formatINR(
        range.high,
      )} — this is capped by what your collateral supports (${formatINR(
        Math.round(ltvCeiling),
      )}), which is the binding constraint here, not your repayment capacity.`
    : `Using your ${collateralType} as collateral, a ${productLabel} at ${securedFairRate.value.low}%–${securedFairRate.value.high}% over ${tenureMonths} months${ageNote} could safely go up to roughly ${formatINR(
        range.low,
      )}–${formatINR(range.high)} — here your repayment capacity, not the collateral value, is the binding constraint.`;

  return {
    value: range,
    rationale,
    confidence,
    sourceOrJudgement: "Derived arithmetically from calculateAffordability, calculateFairRate, and the LTV ceiling in calculateLikelySanction — see RULES.md §2, §3, §4, §11.",
    ...(limitedBy.length > 0 ? { limitedBy } : {}),
    tenureMonths,
    collateralType,
  };
}
