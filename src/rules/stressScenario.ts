import type { BorrowerProfile, CalculationResult, StabilityTier } from "../types/borrower";
import { calculateAffordability } from "./affordability";
import { calculateEMI } from "../calculations/emi";
import {
  STRESS_INCOME_DROP_FRACTION,
  STRESS_RATE_RISE_PERCENTAGE_POINTS,
} from "../data/thresholds";
import { formatINR } from "../utils/formatCurrency";

export interface StressScenarioValue {
  /** Recomputed safe EMI ceiling if net income dropped by the documented fraction. */
  safeEmiUnderIncomeDrop: number;
  /** Whether the borrower's proposed EMI would breach that reduced ceiling. */
  incomeDropBreach: boolean;
  /** Recomputed EMI on the same principal/tenure if the rate rose by the documented amount. */
  emiUnderRateRise: number;
  /** Whether that higher EMI would breach the ORIGINAL safe ceiling. */
  rateRiseBreach: boolean;
}

/**
 * O4's required stress case. Two independent scenarios, per RULES.md §7:
 *
 * 1. Income drop: net income falls by STRESS_INCOME_DROP_FRACTION (20%).
 *    Recompute the safe EMI ceiling under that lower income, and check
 *    whether the borrower's proposed EMI would now breach it.
 * 2. Rate rise: the rate on the SAME principal/tenure rises by
 *    STRESS_RATE_RISE_PERCENTAGE_POINTS (2pp). Recompute the EMI and check
 *    whether it would breach the original (non-stressed) safe ceiling.
 *
 * Both magnitudes are explicitly documented as round, explainable judgement
 * calls, not regulatory or actuarial figures.
 */
export function calculateStressScenario(
  profile: BorrowerProfile,
  stabilityTier: StabilityTier,
  proposedEmi: number,
  proposedPrincipal: number,
  proposedAnnualRatePercent: number,
  proposedTenureMonths: number,
): CalculationResult<StressScenarioValue> {
  // --- Income-drop scenario ---
  const stressedIncome =
    profile.netMonthlyIncome !== undefined ? profile.netMonthlyIncome * (1 - STRESS_INCOME_DROP_FRACTION) : undefined;
  const stressedProfile: BorrowerProfile = { ...profile, netMonthlyIncome: stressedIncome };
  const stressedAffordability = calculateAffordability(stressedProfile, stabilityTier);
  const safeEmiUnderIncomeDrop = stressedAffordability.value;
  const incomeDropBreach = proposedEmi > safeEmiUnderIncomeDrop;

  // --- Rate-rise scenario ---
  // Guard for the legitimate case where there's no principal to stress-test
  // at all (e.g. the safe amount is already ₹0) — calculateEMI correctly
  // rejects non-positive principal, so we short-circuit here rather than
  // let that propagate as a crash for what is a valid, meaningful state.
  const stressedRate = proposedAnnualRatePercent + STRESS_RATE_RISE_PERCENTAGE_POINTS;
  const emiUnderRateRise =
    proposedPrincipal > 0 && proposedTenureMonths > 0
      ? Math.round(calculateEMI(proposedPrincipal, stressedRate, proposedTenureMonths))
      : 0;
  // Compare against the ORIGINAL (non-stressed) safe ceiling — the question
  // is "does a rate rise alone push you over the ceiling you have today?"
  const originalAffordability = calculateAffordability(profile, stabilityTier);
  const rateRiseBreach = emiUnderRateRise > originalAffordability.value;

  const rationaleParts: string[] = [];
  if (proposedPrincipal <= 0) {
    rationaleParts.push("There's no borrowing amount to stress-test yet — this shows once a safe borrowing amount is available.");
  } else if (incomeDropBreach) {
    rationaleParts.push(
      `If your income dropped ${Math.round(STRESS_INCOME_DROP_FRACTION * 100)}%, your safe EMI ceiling would fall to ${formatINR(
        safeEmiUnderIncomeDrop,
      )} — below the ${formatINR(proposedEmi)} EMI being considered.`,
    );
  } else {
    rationaleParts.push(
      `Even with a ${Math.round(STRESS_INCOME_DROP_FRACTION * 100)}% income drop, your safe EMI ceiling (${formatINR(
        safeEmiUnderIncomeDrop,
      )}) would still cover the ${formatINR(proposedEmi)} EMI being considered.`,
    );
  }
  if (proposedPrincipal > 0) {
    if (rateRiseBreach) {
      rationaleParts.push(
        `If the rate rose by ${STRESS_RATE_RISE_PERCENTAGE_POINTS} percentage points, your EMI would rise to ${formatINR(
          emiUnderRateRise,
        )} — above your current safe ceiling of ${formatINR(originalAffordability.value)}.`,
      );
    } else {
      rationaleParts.push(
        `A ${STRESS_RATE_RISE_PERCENTAGE_POINTS}-percentage-point rate rise would bring your EMI to ${formatINR(
          emiUnderRateRise,
        )}, still within your safe ceiling of ${formatINR(originalAffordability.value)}.`,
      );
    }
  }

  const confidence =
    stressedAffordability.confidence === "low" || originalAffordability.confidence === "low" ? "low" : "medium";

  return {
    value: { safeEmiUnderIncomeDrop, incomeDropBreach, emiUnderRateRise, rateRiseBreach },
    rationale: rationaleParts.join(" "),
    confidence,
    sourceOrJudgement: "My judgement — stress magnitudes documented in RULES.md §7, not regulatory figures.",
  };
}
