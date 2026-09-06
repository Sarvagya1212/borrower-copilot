import type { BorrowerProfile, BorrowingVerdict, CalculationResult, Range } from "../types/borrower";
import { HIGH_COST_EXISTING_DEBT_RATE_PERCENT, BORROW_LESS_TRIGGER_FRACTION } from "../data/thresholds";
import type { SecuredSafeBorrowingAmount } from "./safeBorrowingAmount";
import { formatINR } from "../utils/formatCurrency";

const PRODUCTIVE_PURPOSES: BorrowerProfile["loanPurpose"][] = [
  "vehicle_for_income",
  "business_stock_or_equipment",
];

export interface PathSummary {
  range: Range;
  rateBand: Range;
  productLabel: string;
}

export interface SecuredComparison {
  unsecured: PathSummary;
  secured: PathSummary & { collateralType: "gold" | "property" };
  /** Which path the verdict actually used to judge the requested amount. */
  betterPath: "unsecured" | "secured";
}

export interface VerdictInput {
  profile: BorrowerProfile;
  safeAmount: CalculationResult<Range>;
  safeEmiCeiling: number;
  /** Optional — needed to populate the unsecured side of a securedComparison. */
  unsecuredFairRate?: CalculationResult<Range>;
  /** Optional — when present (and better), the verdict compares the
   *  requested amount against this path instead of / alongside the
   *  unsecured one. See Decision D5. */
  securedSafeAmount?: SecuredSafeBorrowingAmount;
  securedFairRate?: CalculationResult<Range>;
}

export interface VerdictResult {
  verdict: BorrowingVerdict;
  /** The single deciding factor, stated plainly — this is what the
   *  borrower (and the follow-up interview) should be able to point to. */
  decidingFactor: string;
  rationale: string;
  /** Present whenever a secured alternative was evaluated, regardless of
   *  which path won — the borrower should see the trade-off, not just the
   *  winning number (Decision D5). */
  securedComparison?: SecuredComparison;
}

function productLabelFor(profile: BorrowerProfile): string {
  switch (profile.loanType) {
    case "gold_loan":
      return "gold loan";
    case "loan_against_property":
      return "loan against property";
    case "home_loan":
      return "home loan";
    case "two_wheeler_loan":
      return "two-wheeler loan";
    case "business_loan":
      return "business loan";
    default:
      return "personal loan";
  }
}

/**
 * The final judgement. Implements, in priority order:
 *
 * 1. Zero safe EMI ceiling -> "don't borrow", unconditionally. This is the
 *    brief's required "don't borrow must be reachable" floor case. Applies
 *    regardless of secured/unsecured — zero EMI headroom means no product
 *    is genuinely serviceable right now (Decision D6: the secured path is
 *    ALSO capped by safe-EMI, not just LTV).
 * 2. A recent payment bounce alongside existing HIGH-COST debt -> "don't
 *    borrow" — stabilizing existing distress-priced debt takes priority
 *    over new borrowing, even for a stated productive purpose (Decision D3:
 *    the bounce signal overrides the productive-purpose framing, it isn't
 *    averaged against it). This is the Anita case.
 * 3. A recent bounce WITHOUT known high-cost existing debt -> "borrow_less",
 *    capped well below the safe ceiling, flagged as cautious.
 * 4. Requested amount vs. the BETTER of the unsecured/secured safe ranges
 *    (Decision D5) -> "borrow_less" if it exceeds even the better range's
 *    high end by more than BORROW_LESS_TRIGGER_FRACTION; "borrow" (via the
 *    better path, named explicitly) otherwise.
 * 5. Productive purpose changes the LANGUAGE, never the number
 *    (Decision D3's capped-influence rule).
 */
export function getBorrowingVerdict(input: VerdictInput): VerdictResult {
  const { profile, safeAmount, safeEmiCeiling, unsecuredFairRate, securedSafeAmount, securedFairRate } = input;

  // --- Build the comparison object, if a secured alternative was evaluated ---
  let securedComparison: SecuredComparison | undefined;
  let betterRange = safeAmount.value;
  let betterPathLabel = productLabelFor(profile);
  let usingSecuredPath = false;

  if (securedSafeAmount && securedFairRate) {
    const securedIsBetter = securedSafeAmount.value.high > safeAmount.value.high;
    securedComparison = {
      unsecured: {
        range: safeAmount.value,
        rateBand: unsecuredFairRate?.value ?? { low: 0, high: 0 },
        productLabel: productLabelFor(profile),
      },
      secured: {
        range: securedSafeAmount.value,
        rateBand: securedFairRate.value,
        productLabel: securedSafeAmount.collateralType === "property" ? "loan against property" : "gold loan",
        collateralType: securedSafeAmount.collateralType,
      },
      betterPath: securedIsBetter ? "secured" : "unsecured",
    };
    if (securedIsBetter) {
      betterRange = securedSafeAmount.value;
      betterPathLabel = securedComparison.secured.productLabel;
      usingSecuredPath = true;
    }
  }

  if (safeEmiCeiling <= 0) {
    return {
      verdict: "dont_borrow",
      decidingFactor: "No safe EMI headroom at your current income and obligations.",
      rationale:
        "Based on your income, existing obligations, and essential expenses, there's no room for a new EMI right now without cutting into money you need for essentials — this applies whether the loan is secured or unsecured, since it's about what you can repay, not what a lender might sanction. We recommend not taking on new debt until your situation changes.",
      securedComparison,
    };
  }

  const hasHighCostExistingDebt = (profile.existingLoanRatesKnown ?? []).some(
    (rate) => rate >= HIGH_COST_EXISTING_DEBT_RATE_PERCENT,
  );

  if (profile.hadPaymentBounceRecently === true && hasHighCostExistingDebt) {
    return {
      verdict: "dont_borrow",
      decidingFactor: "A recent payment bounce, combined with existing high-cost debt.",
      rationale:
        "You've had a payment bounce recently and are already carrying debt at a high rate. Taking on a new EMI now would add risk on top of an already strained situation. The priority is stabilizing or renegotiating your existing debt before adding new obligations — even though the purpose you gave could genuinely help your income, it doesn't outweigh the immediate repayment risk.",
      securedComparison,
    };
  }

  if (profile.hadPaymentBounceRecently === true) {
    return {
      verdict: "borrow_less",
      decidingFactor: "A recent payment bounce.",
      rationale:
        "A payment bounce in the last several months is a real warning sign, even without other high-cost debt on record. If you do borrow, keep it well below your calculated safe ceiling and prioritize rebuilding a clean repayment record.",
      securedComparison,
    };
  }

  const requestedAmount = profile.amountWanted;
  if (requestedAmount !== undefined && requestedAmount > betterRange.high * (1 + BORROW_LESS_TRIGGER_FRACTION)) {
    const pathNote = usingSecuredPath
      ? ` We've compared this against your best available option (a ${betterPathLabel}), not just what you originally asked about — it's still not enough to cover the full amount comfortably.`
      : "";
    return {
      verdict: "borrow_less",
      decidingFactor: `Requested amount (${formatINR(requestedAmount)}) is well above your safe borrowing range${
        usingSecuredPath ? ` (even via a ${betterPathLabel})` : ""
      }.`,
      rationale: `You asked about ${formatINR(
        requestedAmount,
      )}, but your safe borrowing range is roughly ${formatINR(betterRange.low)}–${formatINR(
        betterRange.high,
      )}${usingSecuredPath ? ` via a ${betterPathLabel}` : ""}. We recommend borrowing within that range rather than the full amount requested, even if a lender is willing to sanction more.${pathNote}`,
      securedComparison,
    };
  }

  const isProductive =
    profile.loanExpectedToGenerateIncome === true ||
    (profile.loanExpectedToGenerateIncome === undefined && PRODUCTIVE_PURPOSES.includes(profile.loanPurpose));
  const expectedIncomeNote =
    isProductive && profile.expectedMonthlyIncomeFromLoan !== undefined
      ? ` You mentioned this could bring in roughly ${formatINR(profile.expectedMonthlyIncomeFromLoan)}/month — worth keeping in mind, but it doesn't raise the safe amount above what your existing income and obligations can support.`
      : "";
  const productiveNote = isProductive
    ? ` Since this loan is meant to help generate income, it's worth treating as a more deliberate, investment-style decision than a purely discretionary one — but the amount you should borrow is still capped by what you can safely repay, not by how much the loan might earn.${expectedIncomeNote}`
    : "";
  const pathNote = usingSecuredPath
    ? ` Note this is via a ${betterPathLabel} using your collateral, not the ${productLabelFor(
        profile,
      )} you originally asked about — it's both a larger safe amount and a better rate, worth asking your lender about directly.`
    : "";

  return {
    verdict: "borrow",
    decidingFactor: isProductive
      ? `Requested amount is within your safe range${usingSecuredPath ? ` (via a ${betterPathLabel})` : ""}, and the purpose is income-generating.`
      : `Requested amount is within your safe range${usingSecuredPath ? ` (via a ${betterPathLabel})` : ""}.`,
    rationale: `Borrowing within your safe range of roughly ${formatINR(betterRange.low)}–${formatINR(
      betterRange.high,
    )}${usingSecuredPath ? ` (via a ${betterPathLabel})` : ""} looks reasonable given your income and obligations.${productiveNote}${pathNote}`,
    securedComparison,
  };
}
