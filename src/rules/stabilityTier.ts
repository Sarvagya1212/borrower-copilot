import type { BorrowerProfile, CalculationResult, StabilityTier } from "../types/borrower";

/**
 * Determines how stable the borrower's income is, which downstream
 * (calculateAffordability, calculateFairRate, calculateLikelySanction) sets
 * how conservative the FOIR ceiling and rate band should be.
 *
 * See RULES.md §1 for the full table this implements.
 *
 * Rule (in priority order):
 * 1. Self-reported volatility always wins, regardless of income type.
 * 2. Missing income type -> most conservative default (volatile), flagged.
 * 3. Informal/gig income -> always volatile.
 * 4. Missing tenure -> conservative default for the known income type, flagged.
 * 5. Salaried: >=1 year = stable, <1 year = moderate.
 * 6. Self-employed (documented): >=2 years = moderate, <2 years = volatile.
 */
export function calculateStabilityTier(
  profile: BorrowerProfile,
): CalculationResult<StabilityTier> {
  if (profile.incomeIsSeasonalOrVolatile === true) {
    return {
      value: "volatile",
      rationale:
        "You told us your income is seasonal or unpredictable, so we treat it as volatile regardless of your income type.",
      confidence: "high",
      sourceOrJudgement: "My judgement — a direct volatility signal overrides the general income-type default.",
    };
  }

  if (!profile.incomeType) {
    return {
      value: "volatile",
      rationale:
        "We don't know your income type yet, so we default to the most conservative stability assumption until you tell us.",
      confidence: "low",
      sourceOrJudgement: "My judgement",
      limitedBy: ["incomeType"],
    };
  }

  if (profile.incomeType === "informal_or_gig") {
    return {
      value: "volatile",
      rationale:
        "Informal or gig income is the least predictable of the income types we model, so we apply the most conservative stability tier.",
      confidence: "high",
      sourceOrJudgement: "My judgement",
    };
  }

  const tenure = profile.tenureYearsInJobOrBusiness;
  if (tenure === undefined) {
    const value: StabilityTier = profile.incomeType === "salaried" ? "moderate" : "volatile";
    const activity = profile.incomeType === "salaried" ? "your current job" : "your business";
    return {
      value,
      rationale: `We don't know how long you've been at ${activity}, so we assume a shorter track record until you tell us.`,
      confidence: "low",
      sourceOrJudgement: "My judgement",
      limitedBy: ["tenureYearsInJobOrBusiness"],
    };
  }

  if (profile.incomeType === "salaried") {
    if (tenure >= 1) {
      return {
        value: "stable",
        rationale: `${tenure} year(s) in your current job is an established track record, so we treat your income as stable.`,
        confidence: "high",
        sourceOrJudgement: "My judgement",
      };
    }
    return {
      value: "moderate",
      rationale: "Less than a year in your current job is real income, but a shorter track record — we're moderately cautious rather than treating it as fully stable.",
      confidence: "high",
      sourceOrJudgement: "My judgement",
    };
  }

  // self_employed_documented
  if (tenure >= 2) {
    return {
      value: "moderate",
      rationale: `${tenure} year(s) running the business is a real track record, but self-employed income is inherently more variable than salaried income, so we cap this at moderate rather than stable.`,
      confidence: "high",
      sourceOrJudgement: "My judgement",
    };
  }
  return {
    value: "volatile",
    rationale: "A business under 2 years old doesn't yet have enough of a track record to treat as more than volatile.",
    confidence: "high",
    sourceOrJudgement: "My judgement",
  };
}
