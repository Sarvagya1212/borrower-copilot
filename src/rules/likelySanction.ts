import type { BorrowerProfile, CalculationResult, Range } from "../types/borrower";
import {
  LENDER_FOIR_CEILING,
  INCOME_MULTIPLE_CAP,
  UNDOCUMENTED_INCOME_HAIRCUT_FRACTION,
  RATE_BANDS,
  SANCTION_SIZING_REFERENCE_TENURE_MONTHS,
  LTV,
} from "../data/thresholds";
import { calculateCreditRiskTier } from "./creditRiskTier";
import { principalFromEMI } from "../calculations/emi";
import { formatINR } from "../utils/formatCurrency";

export interface SecuredAlternative {
  collateralType: "gold" | "property";
  estimatedAmount: number;
  rationale: string;
}

export interface LikelySanctionResult extends CalculationResult<Range> {
  /** Present only when the borrower has usable, unencumbered collateral —
   *  this is offered as an ALTERNATIVE route, not blended into the main
   *  unsecured-lending range, because it's a genuinely different product
   *  with a genuinely different rate (see RULES.md §10 and Decision-worthy
   *  routing logic motivated directly by the Ravi persona). */
  securedAlternative?: SecuredAlternative;
}

/**
 * The lender-side "likely sanction" number — kept strictly separate from
 * calculateAffordability (Decision D1). This number can be HIGHER than the
 * safe amount (typical over-lending-risk case) or LOWER than it (the Ravi
 * case: a self-employed borrower's real cash flow exceeds what a formal
 * lender will size against thin documentation).
 *
 * Method: two independent estimates, the lower of the two wins per bound
 * (RULES.md §3):
 * 1. FOIR-based: lender FOIR ceiling (by credit-risk tier) applied to
 *    DOCUMENTED income only, converted to a principal range using the
 *    personal-loan rate band for that tier as a sizing reference (this
 *    reference rate is NOT the fair-rate band shown to the borrower later —
 *    it's purely an internal conversion step, see SANCTION_SIZING_REFERENCE_TENURE_MONTHS).
 * 2. Income-multiple cross-check: a simple multiple of documented monthly
 *    income, matching common personal-loan sizing conventions.
 *
 * If the borrower has usable, unencumbered collateral, a secured
 * alternative (LAP or gold loan, sized by loan-to-value) is surfaced
 * separately rather than blended in — it's a different product, not a
 * bigger unsecured number.
 */
export function calculateLikelySanction(profile: BorrowerProfile): LikelySanctionResult {
  const limitedBy: string[] = [];
  const riskAssessment = calculateCreditRiskTier(profile);
  if (riskAssessment.limitedBy) limitedBy.push(...riskAssessment.limitedBy);
  const { lenderFoirTier } = riskAssessment.value;

  // --- Determine the documented-income base ---
  let documentedMonthlyIncome: number | null = null;
  let incomeBasisNote = "";
  let multipleCap = INCOME_MULTIPLE_CAP.salaried;

  if (profile.incomeType === "salaried") {
    if (profile.netMonthlyIncome !== undefined) {
      documentedMonthlyIncome = profile.netMonthlyIncome;
      incomeBasisNote = "your stated salaried net income";
      multipleCap = INCOME_MULTIPLE_CAP.salaried;
    } else {
      limitedBy.push("netMonthlyIncome");
    }
  } else if (profile.incomeType === "self_employed_documented" || profile.incomeType === "informal_or_gig") {
    multipleCap = INCOME_MULTIPLE_CAP.selfEmployedDocumented;
    if (profile.documentedAnnualIncome !== undefined) {
      documentedMonthlyIncome = profile.documentedAnnualIncome / 12;
      incomeBasisNote = "your documented (ITR) annual income";
    } else if (profile.netMonthlyIncome !== undefined) {
      // No ITR/documented figure given — haircut the stated cash income as
      // a rough proxy for what a formal lender would likely recognize.
      // This is flagged in RULES.md §3 as one of the weakest-evidenced
      // assumptions in the whole table.
      documentedMonthlyIncome = profile.netMonthlyIncome * UNDOCUMENTED_INCOME_HAIRCUT_FRACTION;
      incomeBasisNote = `a conservative ${Math.round(
        UNDOCUMENTED_INCOME_HAIRCUT_FRACTION * 100,
      )}% haircut on your stated cash income, since no documented (ITR) income was provided`;
      limitedBy.push("documentedAnnualIncome");
    } else {
      limitedBy.push("netMonthlyIncome");
    }
  } else {
    limitedBy.push("incomeType");
  }

  const existingEmi = profile.existingMonthlyEmiTotal ?? 0;
  if (profile.existingMonthlyEmiTotal === undefined) limitedBy.push("existingMonthlyEmiTotal");

  let unsecuredRange: Range = { low: 0, high: 0 };
  let unsecuredRationale =
    "We don't have enough income information yet to estimate a likely lender sanction.";

  if (documentedMonthlyIncome !== null) {
    const foirFraction = LENDER_FOIR_CEILING[lenderFoirTier];
    const emiHeadroom = Math.max(0, documentedMonthlyIncome * foirFraction - existingEmi);

    // Use the personal-loan rate band for this borrower's rate-band tier as
    // a sizing reference — see docstring above for why this is internal,
    // not the borrower-facing fair-rate band.
    const referenceBand = RATE_BANDS.personalLoan[riskAssessment.value.rateBandTier];
    const principalAtLowRate = principalFromEMI(
      emiHeadroom,
      referenceBand.low,
      SANCTION_SIZING_REFERENCE_TENURE_MONTHS,
    );
    const principalAtHighRate = principalFromEMI(
      emiHeadroom,
      referenceBand.high,
      SANCTION_SIZING_REFERENCE_TENURE_MONTHS,
    );
    const foirBasedRange: Range = { low: principalAtHighRate, high: principalAtLowRate };

    const incomeMultipleRange: Range = {
      low: documentedMonthlyIncome * multipleCap.low,
      high: documentedMonthlyIncome * multipleCap.high,
    };

    // Final = the lower of the two methods, per bound (RULES.md §3).
    unsecuredRange = {
      low: Math.round(Math.min(foirBasedRange.low, incomeMultipleRange.low)),
      high: Math.round(Math.min(foirBasedRange.high, incomeMultipleRange.high)),
    };
    if (unsecuredRange.high < unsecuredRange.low) {
      unsecuredRange.high = unsecuredRange.low;
    }

    unsecuredRationale = `A likely unsecured lender sanction is roughly ${formatINR(
      unsecuredRange.low,
    )}–${formatINR(unsecuredRange.high)}, based on ${incomeBasisNote} and typical lender sizing (an income-based affordability check and a income-multiple convention), whichever is more conservative.`;
  }

  // --- Secured alternative ---
  let securedAlternative: SecuredAlternative | undefined;
  if (
    profile.hasCollateral === true &&
    profile.collateralEncumbered === false &&
    profile.collateralEstimatedValue !== undefined &&
    (profile.collateralType === "gold" || profile.collateralType === "property")
  ) {
    const ltvFraction = LTV[profile.collateralType];
    const estimatedAmount = Math.round(profile.collateralEstimatedValue * ltvFraction);
    securedAlternative = {
      collateralType: profile.collateralType,
      estimatedAmount,
      rationale: `Because you own unencumbered ${
        profile.collateralType === "gold" ? "gold" : "property"
      } worth about ${formatINR(profile.collateralEstimatedValue)}, a secured loan (${
        profile.collateralType === "gold" ? "gold loan" : "loan against property"
      }) could realistically go up to about ${formatINR(
        estimatedAmount,
      )} at a meaningfully lower rate than an unsecured loan — worth considering as an alternative, not just a bigger version of the same product.`,
    };
  }

  const confidence: "low" | "medium" | "high" =
    limitedBy.length === 0 ? "high" : limitedBy.length <= 1 ? "medium" : "low";

  return {
    value: unsecuredRange,
    rationale: unsecuredRationale,
    confidence,
    sourceOrJudgement: "My judgement — see RULES.md §3 for the FOIR, income-multiple, and haircut assumptions.",
    ...(limitedBy.length > 0 ? { limitedBy } : {}),
    ...(securedAlternative ? { securedAlternative } : {}),
  };
}
