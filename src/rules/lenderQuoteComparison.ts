import type { Range } from "../types/borrower";

export type QuoteComparisonVerdict = "below_fair_range" | "within_fair_range" | "above_fair_range";

export interface LenderQuoteComparison {
  verdict: QuoteComparisonVerdict;
  gapPercentagePoints: number; // positive = lender quote is worse (higher) than the fair range
  summary: string;
}

/**
 * Compares a lender's quoted rate against the fair-rate band, for the
 * Negotiation Card's "how the lender's quoted rate compares with the fair
 * range" requirement. Pure comparison — no judgement about WHY the rates
 * differ, that's already captured in the fair-rate rationale.
 */
export function compareToLenderQuote(fairRange: Range, lenderQuotedRate: number): LenderQuoteComparison {
  if (lenderQuotedRate > fairRange.high) {
    const gap = Math.round((lenderQuotedRate - fairRange.high) * 100) / 100;
    return {
      verdict: "above_fair_range",
      gapPercentagePoints: gap,
      summary: `The lender's quoted ${lenderQuotedRate}% is ${gap} percentage points above the top of your fair range (${fairRange.low}%–${fairRange.high}%) — worth pushing back on.`,
    };
  }
  if (lenderQuotedRate < fairRange.low) {
    const gap = Math.round((fairRange.low - lenderQuotedRate) * 100) / 100;
    return {
      verdict: "below_fair_range",
      gapPercentagePoints: -gap,
      summary: `The lender's quoted ${lenderQuotedRate}% is actually below your fair range (${fairRange.low}%–${fairRange.high}%) — a good offer, worth confirming there's no catch (fees, insurance add-ons, floating-rate reset terms).`,
    };
  }
  return {
    verdict: "within_fair_range",
    gapPercentagePoints: 0,
    summary: `The lender's quoted ${lenderQuotedRate}% falls within your fair range (${fairRange.low}%–${fairRange.high}%) — reasonable, though it's still worth asking whether the lower end is available.`,
  };
}
