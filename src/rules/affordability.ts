import type { BorrowerProfile, CalculationResult, StabilityTier } from "../types/borrower";
import {
  FOIR_CEILING,
  SUBSISTENCE_BUFFER_FRACTION,
  BOUNCE_SAFE_EMI_REDUCTION_FRACTION,
  EMERGENCY_SAVINGS_COMFORTABLE_MONTHS,
  EMERGENCY_SAVINGS_THIN_MONTHS,
  EMERGENCY_SAVINGS_BUFFER_MULTIPLIER,
} from "../data/thresholds";
import { formatINR } from "../utils/formatCurrency";

/**
 * The borrower-side "safe/affordable amount" the brief requires, kept
 * strictly separate from calculateLikelySanction (the lender-side number —
 * see Decision D1). This is the number the app tells the borrower to
 * actually use.
 *
 * Two independent ceilings are computed and the LOWER one wins (Decision D2):
 *
 * 1. FOIR-based: (FOIR ceiling for this stability tier) x net income, minus
 *    existing EMI.
 * 2. Subsistence-floor: net income minus essential expenses minus existing
 *    EMI minus a safety buffer minus any known upcoming one-off expense
 *    (spread over 12 months). This catches cases a pure percentage rule
 *    misses — a FOIR-based ceiling can look affordable while leaving too
 *    little absolute rupee residual for a low-income household.
 *
 * A recent payment bounce reduces the result further — it's the strongest
 * available real-world signal of current repayment strain, so it overrides
 * an otherwise-comfortable calculation.
 *
 * See RULES.md §2 for the full rule table this implements.
 */
export function calculateAffordability(
  profile: BorrowerProfile,
  stabilityTier: StabilityTier,
): CalculationResult<number> {
  const limitedBy: string[] = [];

  if (profile.netMonthlyIncome === undefined) limitedBy.push("netMonthlyIncome");
  if (profile.existingMonthlyEmiTotal === undefined) limitedBy.push("existingMonthlyEmiTotal");
  if (profile.essentialMonthlyExpenses === undefined) limitedBy.push("essentialMonthlyExpenses");

  const netIncomeOwn = profile.netMonthlyIncome ?? 0;
  const coApplicantIncome =
    profile.hasCoApplicant === true ? profile.coApplicantMonthlyIncome ?? 0 : 0;
  const netIncome = netIncomeOwn + coApplicantIncome;
  const existingEmi = profile.existingMonthlyEmiTotal ?? 0;

  // --- Ceiling 1: FOIR-based ---
  const foirCeilingFraction = FOIR_CEILING[stabilityTier];
  const foirBasedEmi = netIncome * foirCeilingFraction - existingEmi;

  // --- Ceiling 2: subsistence-floor backstop ---
  let bufferMultiplier = EMERGENCY_SAVINGS_BUFFER_MULTIPLIER.default;
  if (profile.emergencySavingsMonths !== undefined) {
    if (profile.emergencySavingsMonths >= EMERGENCY_SAVINGS_COMFORTABLE_MONTHS) {
      bufferMultiplier = EMERGENCY_SAVINGS_BUFFER_MULTIPLIER.comfortable;
    } else if (profile.emergencySavingsMonths < EMERGENCY_SAVINGS_THIN_MONTHS) {
      bufferMultiplier = EMERGENCY_SAVINGS_BUFFER_MULTIPLIER.thin;
    }
  }
  const buffer = netIncome * SUBSISTENCE_BUFFER_FRACTION * bufferMultiplier;
  const upcomingMonthlyEquivalent = (profile.upcomingLargeExpense ?? 0) / 12;
  const hasEssentialExpenses = profile.essentialMonthlyExpenses !== undefined;
  const floorBasedEmi = hasEssentialExpenses
    ? netIncome - (profile.essentialMonthlyExpenses as number) - existingEmi - buffer - upcomingMonthlyEquivalent
    : null;

  let bindingConstraint: "FOIR ceiling" | "subsistence floor";
  let preBounceEmi: number;
  if (floorBasedEmi !== null && floorBasedEmi < foirBasedEmi) {
    preBounceEmi = floorBasedEmi;
    bindingConstraint = "subsistence floor";
  } else {
    preBounceEmi = foirBasedEmi;
    bindingConstraint = "FOIR ceiling";
  }

  // --- Bounce reduction ---
  const bounced = profile.hadPaymentBounceRecently === true;
  const safeEmiRaw = bounced ? preBounceEmi * (1 - BOUNCE_SAFE_EMI_REDUCTION_FRACTION) : preBounceEmi;
  const safeEmi = Math.max(0, Math.round(safeEmiRaw));

  // --- Confidence ---
  let confidence: "low" | "medium" | "high" = "high";
  if (limitedBy.length >= 2) confidence = "low";
  else if (limitedBy.length === 1) confidence = "medium";
  if (profile.hadPaymentBounceRecently === undefined) {
    // Not knowing whether a bounce happened is itself a real gap for the
    // riskier tiers — downgrade one notch, but never below low.
    if (confidence === "high") confidence = "medium";
    else if (confidence === "medium") confidence = "low";
    limitedBy.push("hadPaymentBounceRecently");
  }

  // --- Rationale ---
  const foirPercent = Math.round(foirCeilingFraction * 100);
  let rationale = `Your safe EMI ceiling is ${formatINR(safeEmi)}. `;
  if (bindingConstraint === "FOIR ceiling") {
    rationale += `This is capped at ${foirPercent}% of your net income (your income stability tier is "${stabilityTier}") minus your existing EMI of ${formatINR(existingEmi)}.`;
  } else {
    rationale += `Even though the ${foirPercent}% FOIR limit for your stability tier would allow more, your essential expenses (${formatINR(
      profile.essentialMonthlyExpenses ?? 0,
    )}) and existing EMI (${formatINR(existingEmi)}) leave less room than that — we use the lower, safer number rather than the percentage-based one.`;
  }
  if (coApplicantIncome > 0) {
    rationale += ` This includes your co-applicant's income of ${formatINR(coApplicantIncome)}/month, treated as combined household income.`;
  }
  if (bufferMultiplier === EMERGENCY_SAVINGS_BUFFER_MULTIPLIER.comfortable) {
    rationale += ` Because you have a solid emergency-savings cushion, we've allowed a smaller safety buffer than we otherwise would.`;
  } else if (bufferMultiplier === EMERGENCY_SAVINGS_BUFFER_MULTIPLIER.thin) {
    rationale += ` Because you have little to no emergency savings, we've built in a larger safety buffer than usual.`;
  }
  if (bounced) {
    rationale += ` We've reduced this further by ${Math.round(
      BOUNCE_SAFE_EMI_REDUCTION_FRACTION * 100,
    )}% because of a payment bounce in the last several months — a strong real-world signal of current repayment strain.`;
  }
  if (safeEmi === 0) {
    rationale += " At your current income and obligations, we don't see room for a new EMI right now.";
  }

  return {
    value: safeEmi,
    rationale,
    confidence,
    sourceOrJudgement: "My judgement — see RULES.md §2 for the FOIR and subsistence-floor assumptions.",
    ...(limitedBy.length > 0 ? { limitedBy } : {}),
  };
}
