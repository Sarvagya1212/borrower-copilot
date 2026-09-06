import type { CalculationResult } from "../types/borrower";
import type { StressScenarioValue } from "../rules/stressScenario";
import { ConfidenceTag } from "./ConfidenceTag";

/**
 * Renders O4's stress scenario — two independent checks (income drop, rate
 * rise), each with a pass/breach indicator. The whole block is warn-toned
 * if EITHER breaches, opportunity-toned if both pass. A zero-principal case
 * (no borrowing amount yet) is handled gracefully — the rationale from the
 * rule function already explains why.
 */
export function StressScenarioBlock({
  stress,
}: {
  stress: CalculationResult<StressScenarioValue>;
}) {
  const { incomeDropBreach, rateRiseBreach } = stress.value;
  const anyBreach = incomeDropBreach || rateRiseBreach;
  const blockClass = anyBreach ? "warn" : "opportunity";

  return (
    <div className={`signal-block ${blockClass}`}>
      <h3>What if things change?</h3>
      <p className="rationale" style={{ marginTop: 0 }}>
        {stress.rationale}
      </p>
      <div className="ledger">
        <div className="ledger-row">
          <span className="label">Income drops 20%</span>
          <span className={`value ${incomeDropBreach ? "breach" : "pass"}`}>
            {incomeDropBreach ? "⚠ would breach" : "✓ still safe"}
          </span>
        </div>
        <div className="ledger-row">
          <span className="label">Rate rises 2pp</span>
          <span className={`value ${rateRiseBreach ? "breach" : "pass"}`}>
            {rateRiseBreach ? "⚠ would breach" : "✓ still safe"}
          </span>
        </div>
      </div>
      <div style={{ marginTop: "0.6rem" }}>
        <ConfidenceTag level={stress.confidence} />
      </div>
    </div>
  );
}
