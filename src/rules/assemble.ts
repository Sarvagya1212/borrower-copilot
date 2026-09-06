import type { BorrowerProfile, CalculationResult, Range } from "../types/borrower";
import { calculateStabilityTier } from "./stabilityTier";
import { calculateAffordability } from "./affordability";
import { calculateLikelySanction } from "./likelySanction";
import { calculateFairRate } from "./fairRate";
import { calculateSafeBorrowingAmount, calculateSecuredSafeBorrowingAmount, type SecuredSafeBorrowingAmount } from "./safeBorrowingAmount";
import { calculateStressScenario } from "./stressScenario";
import { getBorrowingVerdict, type VerdictResult } from "./verdict";
import { compareToLenderQuote, type LenderQuoteComparison } from "./lenderQuoteComparison";
import { calculateEMI } from "../calculations/emi";
import type { StabilityTier } from "../types/borrower";

export interface FullAssessment {
  stability: CalculationResult<StabilityTier>;
  affordability: CalculationResult<number>;
  sanction: ReturnType<typeof calculateLikelySanction>;
  fairRate: CalculationResult<Range>;
  safeAmount: CalculationResult<Range> & { tenureMonths: number };
  securedFairRate?: CalculationResult<Range>;
  securedSafeAmount?: SecuredSafeBorrowingAmount;
  stress: ReturnType<typeof calculateStressScenario>;
  verdict: VerdictResult;
  /** Present only if the borrower shared a lender's quoted rate — compares
   *  it against whichever fair-rate band is actually being recommended
   *  (secured if that's the better path, unsecured otherwise). */
  lenderQuoteComparison?: LenderQuoteComparison;
}

/**
 * Runs the full O1-O4 pipeline for a borrower profile, exactly as described
 * in docs/Flow.md. This is the ONE place the functions in this folder get
 * wired together — tests and (later) UI pages should call this rather than
 * re-assembling the pipeline themselves.
 *
 * This function exists because of a real bug: before it existed, the wiring
 * was duplicated ad hoc inside test files, and the secured-alternative path
 * (Decision D5) was computed by calculateLikelySanction but never actually
 * threaded into calculateSafeBorrowingAmount or getBorrowingVerdict — 91
 * passing unit tests didn't catch it because no single unit test checked
 * this specific interaction. Consolidating the wiring here means that class
 * of gap can't recur silently.
 */
export function runFullAssessment(profile: BorrowerProfile): FullAssessment {
  const stability = calculateStabilityTier(profile);
  const affordability = calculateAffordability(profile, stability.value);
  const sanction = calculateLikelySanction(profile);
  const fairRate = calculateFairRate(profile);
  const safeAmount = calculateSafeBorrowingAmount(profile, affordability, fairRate);

  let securedFairRate: CalculationResult<Range> | undefined;
  let securedSafeAmount: SecuredSafeBorrowingAmount | undefined;
  if (sanction.securedAlternative) {
    const securedLoanType = sanction.securedAlternative.collateralType === "property" ? "loan_against_property" : "gold_loan";
    securedFairRate = calculateFairRate({ ...profile, loanType: securedLoanType });
    securedSafeAmount = calculateSecuredSafeBorrowingAmount(
      profile,
      affordability,
      securedFairRate,
      sanction.securedAlternative.estimatedAmount,
      sanction.securedAlternative.collateralType,
    );
  }

  // Stress-test whichever path is actually being recommended, at a
  // representative EMI (mid-band rate on the recommended tenure).
  const usingSecured = securedSafeAmount && securedSafeAmount.value.high > safeAmount.value.high;
  const recommendedForStress = usingSecured ? securedSafeAmount! : safeAmount;
  const recommendedRateBand = usingSecured ? securedFairRate!.value : fairRate.value;
  const midRate = (recommendedRateBand.low + recommendedRateBand.high) / 2;
  const proposedPrincipal = recommendedForStress.value.high;
  const proposedEmi = proposedPrincipal > 0 ? calculateEMI(proposedPrincipal, midRate, recommendedForStress.tenureMonths) : 0;

  const stress = calculateStressScenario(
    profile,
    stability.value,
    proposedEmi,
    proposedPrincipal,
    midRate,
    recommendedForStress.tenureMonths,
  );

  const verdict = getBorrowingVerdict({
    profile,
    safeAmount,
    safeEmiCeiling: affordability.value,
    unsecuredFairRate: fairRate,
    securedSafeAmount,
    securedFairRate,
  });

  let lenderQuoteComparison: LenderQuoteComparison | undefined;
  if (profile.lenderQuotedRate !== undefined) {
    lenderQuoteComparison = compareToLenderQuote(recommendedRateBand, profile.lenderQuotedRate);
  }

  return { stability, affordability, sanction, fairRate, safeAmount, securedFairRate, securedSafeAmount, stress, verdict, lenderQuoteComparison };
}
