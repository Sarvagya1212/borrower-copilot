import type { BorrowerProfile, CalculationResult } from "../types/borrower";
import { CREDIT_CARD_HIGH_UTILIZATION_THRESHOLD_PERCENT } from "../data/thresholds";

/** Coarser grouping used for FOIR ceilings and income multiples, where
 *  "unknown" and "650-749" are treated the same (RULES.md §3). */
export type LenderFoirTier = "good" | "midOrUnknown" | "weak";

/** Finer grouping used for rate bands, where "unknown" and "never taken
 *  formal credit" get distinct (though similarly cautious) bands (RULES.md §4). */
export type RateBandTier = "good" | "mid" | "unknown" | "neverTaken" | "weak";

export interface CreditRiskAssessment {
  lenderFoirTier: LenderFoirTier;
  rateBandTier: RateBandTier;
}

/**
 * A recent payment bounce is treated as the strongest available signal and
 * overrides everything else, including an otherwise-good credit score —
 * see RULES.md §2/§3 and the underlying design intent in Decision D2.
 *
 * Otherwise: known score >= 750 -> good; known score < 650 -> weak;
 * known score 650-749 -> mid; genuinely unknown score -> unknown (its own
 * tier, never coerced to a number); never taken formal credit -> neverTaken
 * (distinct from unknown — there's no track record to be uncertain about,
 * rather than an existing-but-unrecalled one).
 */
export function calculateCreditRiskTier(
  profile: BorrowerProfile,
): CalculationResult<CreditRiskAssessment> {
  if (profile.hadPaymentBounceRecently === true) {
    return {
      value: { lenderFoirTier: "weak", rateBandTier: "weak" },
      rationale:
        "A payment bounce in the last several months is the strongest available signal of current repayment risk, so we apply the most cautious tier regardless of your credit score.",
      confidence: "high",
      sourceOrJudgement: "My judgement",
    };
  }

  if (!profile.creditScore) {
    return {
      value: { lenderFoirTier: "midOrUnknown", rateBandTier: "unknown" },
      rationale:
        "We don't have your credit score, so we neither assume the best nor the worst — we use a middling, cautious tier and widen the rate band accordingly.",
      confidence: "low",
      sourceOrJudgement: "My judgement",
      limitedBy: ["creditScore"],
    };
  }

  if (profile.creditScore.status === "unknown") {
    return {
      value: { lenderFoirTier: "midOrUnknown", rateBandTier: "unknown" },
      rationale:
        "You told us you don't know your credit score. We never treat that as a bad score — we use a middling tier and a wider, higher rate band to reflect genuine uncertainty, not assumed poor credit.",
      confidence: "medium",
      sourceOrJudgement: "My judgement",
    };
  }

  if (profile.creditScore.status === "never_taken_formal_credit") {
    return {
      value: { lenderFoirTier: "midOrUnknown", rateBandTier: "neverTaken" },
      rationale:
        "You haven't taken formal credit before, so there's no score to go on. This is a thin credit file, not a bad one — we use a similarly cautious tier to an unknown score, flagged separately since the situation is different.",
      confidence: "medium",
      sourceOrJudgement: "My judgement",
    };
  }

  const score = profile.creditScore.score;
  const highUtilization = (profile.creditCardUtilizationPercent ?? 0) >= CREDIT_CARD_HIGH_UTILIZATION_THRESHOLD_PERCENT;

  if (score >= 750) {
    if (highUtilization) {
      return {
        value: { lenderFoirTier: "midOrUnknown", rateBandTier: "mid" },
        rationale: `A credit score of ${score} is normally the strongest pricing tier, but very high credit-card utilization (${profile.creditCardUtilizationPercent}%) is itself a real-world risk signal lenders watch for, so we pull this back to a middling tier rather than the best one.`,
        confidence: "high",
        sourceOrJudgement: "My judgement",
      };
    }
    return {
      value: { lenderFoirTier: "good", rateBandTier: "good" },
      rationale: `A credit score of ${score} is in the strongest pricing tier lenders commonly offer.`,
      confidence: "high",
      sourceOrJudgement: "My judgement, informed by common Indian lender practice (see RULES.md §3-4)",
    };
  }
  if (score < 650) {
    return {
      value: { lenderFoirTier: "weak", rateBandTier: "weak" },
      rationale: `A credit score of ${score} falls in a higher-risk band, which most lenders price more cautiously.`,
      confidence: "high",
      sourceOrJudgement: "My judgement",
    };
  }
  return {
    value: { lenderFoirTier: "midOrUnknown", rateBandTier: "mid" },
    rationale: `A credit score of ${score} is a middling profile — better pricing than a weak score, but not the best tier.`,
    confidence: "high",
    sourceOrJudgement: "My judgement",
  };
}
