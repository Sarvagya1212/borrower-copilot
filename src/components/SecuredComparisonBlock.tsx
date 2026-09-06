import type { SecuredComparison } from "../rules/verdict";
import { formatINR } from "../utils/formatCurrency";
import { LedgerRow } from "./LedgerRow";

/**
 * Renders both the unsecured and secured paths side-by-side, per Decision
 * D5 — the better path is highlighted, but neither is hidden. This exists
 * specifically because of the Ravi finding: showing only the winning
 * number would hide the trade-off (collateral risk, different tenure,
 * different lender) the borrower should actually see.
 */
export function SecuredComparisonBlock({ comparison }: { comparison: SecuredComparison }) {
  const { unsecured, secured, betterPath } = comparison;
  return (
    <div className="signal-block gold">
      <h3>Two ways to borrow this</h3>
      <p className="rationale" style={{ marginTop: 0 }}>
        You have collateral that changes the picture. Here's both paths — the one below is better for your
        situation, but both are real options.
      </p>
      <div className="ledger">
        <LedgerRow
          label={`${unsecured.productLabel}${betterPath === "unsecured" ? " (recommended)" : ""}`}
          value={`${formatINR(unsecured.range.low)}–${formatINR(unsecured.range.high)}`}
        />
        <LedgerRow label="rate" value={`${unsecured.rateBand.low}%–${unsecured.rateBand.high}%`} />
        <LedgerRow
          label={`${secured.productLabel}${betterPath === "secured" ? " (recommended)" : ""}`}
          value={`${formatINR(secured.range.low)}–${formatINR(secured.range.high)}`}
        />
        <LedgerRow label="rate" value={`${secured.rateBand.low}%–${secured.rateBand.high}%`} />
      </div>
    </div>
  );
}
