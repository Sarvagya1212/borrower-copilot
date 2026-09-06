import type { BorrowerProfile, CalculationResult, Range } from "../types/borrower";
import { RATE_BANDS } from "../data/thresholds";
import { calculateCreditRiskTier } from "./creditRiskTier";
import { capConfidence } from "./confidenceUtils";

/** Widens a range outward by a fraction — used when an extra layer of
 *  uncertainty (e.g. loan type not yet chosen) applies on top of the
 *  credit-risk-tier band, which is already differentiated by risk. */
function widen(range: Range, fraction: number): Range {
  const mid = (range.low + range.high) / 2;
  const halfWidth = ((range.high - range.low) / 2) * (1 + fraction);
  return { low: mid - halfWidth, high: mid + halfWidth };
}

/**
 * O3 — the fair interest-rate band. Always a range, never a point (per the
 * brief and Decision-level intent throughout this project). See RULES.md §4.
 *
 * Product routing:
 * - personal_loan / not_sure -> personal-loan band by credit-risk-tier
 * - gold_loan -> a single band regardless of credit-risk tier, because gold
 *   loans price primarily on collateral/LTV, not credit score — a
 *   deliberate, documented simplification, not an oversight
 * - loan_against_property -> documented vs. self-employed-less-documented
 *   sub-band, based on whether a documented/ITR income figure was given
 * - business_loan / two_wheeler_loan -> flat bands, confidence capped at
 *   medium because RULES.md flags these as the weakest-evidenced bands
 *   (no clean current-market source found)
 * - home_loan -> NOT modeled in this build. Rather than fabricate a band,
 *   this is stated plainly, with a rough LAP-documented proxy offered at
 *   low confidence, clearly labeled as a stand-in
 * - missing loan type -> personal-loan band as a generic reference,
 *   additionally widened and confidence-capped, since the product itself
 *   is unknown on top of everything else
 */
export function calculateFairRate(profile: BorrowerProfile): CalculationResult<Range> {
  const limitedBy: string[] = [];
  const riskAssessment = calculateCreditRiskTier(profile);
  if (riskAssessment.limitedBy) limitedBy.push(...riskAssessment.limitedBy);
  const { rateBandTier } = riskAssessment.value;

  // Unknown or thin-file credit tiers already carry a capped confidence in
  // calculateCreditRiskTier (medium at best) — inherited here directly
  // rather than re-deriving it, so the two functions can't quietly disagree.
  let confidence = riskAssessment.confidence;

  let range: Range;
  let productNote: string;
  let sourceOrJudgement =
    "My judgement, drawing on current market data sourced 2026-09-05 — see RULES.md §4 for citations and caveats.";

  switch (profile.loanType) {
    case "gold_loan": {
      range = { ...RATE_BANDS.goldLoan };
      productNote =
        "Gold loans price mainly on the value and purity of the gold pledged, not on your credit profile, so this band applies regardless of your credit-risk tier.";
      // Credit-risk-tier confidence isn't really the driver here — cap at
      // medium rather than inherit a "high" that would overstate certainty
      // about a product whose pricing this app models more coarsely.
      confidence = capConfidence(confidence, "medium");
      break;
    }
    case "loan_against_property": {
      const hasDocumentedIncome =
        profile.incomeType === "salaried" ||
        (profile.incomeType === "self_employed_documented" && profile.documentedAnnualIncome !== undefined);
      range = hasDocumentedIncome
        ? { ...RATE_BANDS.loanAgainstProperty.documented }
        : { ...RATE_BANDS.loanAgainstProperty.selfEmployedLessDocumented };
      productNote = hasDocumentedIncome
        ? "This is the loan-against-property band for a documented-income profile — secured lending prices meaningfully below unsecured personal loans."
        : "This is the loan-against-property band for a less-documented, self-employed profile — still well below unsecured personal-loan pricing, but wider given weaker documentation.";
      break;
    }
    case "business_loan": {
      range = { ...RATE_BANDS.businessLoan };
      productNote =
        "Business-loan pricing for a self-employed/informal borrower, priced analogously to NBFC personal-loan risk bands.";
      confidence = capConfidence(confidence, "medium");
      sourceOrJudgement =
        "My judgement — this is flagged in RULES.md §4 as one of the weakest-evidenced bands in this table; no clean current-market source was found in this session.";
      break;
    }
    case "two_wheeler_loan": {
      range = { ...RATE_BANDS.twoWheelerLoan };
      productNote = "Asset-backed two-wheeler loan pricing, between gold-loan and unsecured personal-loan bands.";
      confidence = capConfidence(confidence, "medium");
      sourceOrJudgement =
        "My judgement — flagged in RULES.md §4 as weakly evidenced; no clean current-market source was found in this session.";
      break;
    }
    case "home_loan": {
      range = { ...RATE_BANDS.loanAgainstProperty.documented };
      productNote =
        "Home-loan pricing isn't specifically modeled in this build — this is a rough stand-in using the loan-against-property band, since both are property-secured. Treat this with extra caution and verify directly with lenders.";
      confidence = "low";
      sourceOrJudgement = "My judgement — home loan is an unmodeled product in this build, stated plainly rather than fabricated.";
      break;
    }
    case "personal_loan":
    case "not_sure":
    case undefined: {
      range = { ...RATE_BANDS.personalLoan[rateBandTier] };
      productNote =
        profile.loanType === "not_sure" || profile.loanType === undefined
          ? "We don't know your intended product yet, so this is a personal-loan band as a generic reference point — it will likely change once you tell us the product."
          : "Unsecured personal-loan band for your credit-risk tier.";
      if (profile.loanType === undefined || profile.loanType === "not_sure") {
        range = widen(range, 0.15);
        confidence = capConfidence(confidence, "medium");
        limitedBy.push("loanType");
      }
      break;
    }
    default: {
      range = { ...RATE_BANDS.personalLoan[rateBandTier] };
      productNote = "Unrecognized product — falling back to the personal-loan band as a generic reference.";
      confidence = "low";
    }
  }

  const roundedRange: Range = {
    low: Math.round(range.low * 100) / 100,
    high: Math.round(range.high * 100) / 100,
  };

  const rationale = `A fair rate for your profile is roughly ${roundedRange.low}%–${roundedRange.high}%. ${productNote} ${riskAssessment.rationale}`;

  return {
    value: roundedRange,
    rationale,
    confidence,
    sourceOrJudgement,
    ...(limitedBy.length > 0 ? { limitedBy } : {}),
  };
}
