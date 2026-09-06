import type { LenderQuoteComparison } from "../rules/lenderQuoteComparison";

/**
 * Renders the lender-quoted-rate vs fair-range comparison. Green-toned
 * (opportunity) if below or within the fair range, warn-toned if above.
 * The summary string from the rule function is already borrower-readable,
 * so this component is intentionally thin.
 */
export function LenderQuoteBlock({ comparison }: { comparison: LenderQuoteComparison }) {
  const blockClass = comparison.verdict === "above_fair_range" ? "warn" : "opportunity";

  const headline =
    comparison.verdict === "above_fair_range"
      ? "The quoted rate looks high"
      : comparison.verdict === "below_fair_range"
        ? "The quoted rate looks good"
        : "The quoted rate is fair";

  return (
    <div className={`signal-block ${blockClass}`}>
      <h3>{headline}</h3>
      <p className="rationale" style={{ marginTop: 0 }}>
        {comparison.summary}
      </p>
    </div>
  );
}
