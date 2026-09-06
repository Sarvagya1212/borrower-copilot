import type { FullAssessment } from "../rules/assemble";
import { formatINR } from "../utils/formatCurrency";
import { ConfidenceTag } from "../components/ConfidenceTag";
import { LedgerRow } from "../components/LedgerRow";
import { LenderQuoteBlock } from "../components/LenderQuoteBlock";
import { calculateAPR } from "../calculations/irr";
import { calculateEMI } from "../calculations/emi";

// Processing fees assumed for APR illustration — RULES.md §5 (as percentages, e.g. 2 = 2%)
const PROCESSING_FEE_PERCENT: Record<string, number> = {
  personal_loan: 2,
  loan_against_property: 1,
  gold_loan: 0.5,
  business_loan: 2,
  two_wheeler_loan: 1.5,
  home_loan: 1,
  not_sure: 2,
};

/**
 * The Negotiation Card — a formatted, take-to-your-lender subset of the
 * Results. Not a separate calculation — it renders from the same
 * FullAssessment. Designed to be readable at a glance, with 2–3 key points
 * and suggested questions to ask the lender.
 */
export function NegotiationCardPage({
  assessment,
  onBackToResults,
  onStartOver,
}: {
  assessment: FullAssessment;
  onBackToResults: () => void;
  onStartOver: () => void;
}) {
  const { safeAmount, fairRate, affordability, verdict, lenderQuoteComparison, stress } = assessment;

  // --- APR estimate (using mid-band rate, assumed fee) ---
  const midRate = (fairRate.value.low + fairRate.value.high) / 2;
  const safePrincipal = safeAmount.value.high;
  const feePercent = PROCESSING_FEE_PERCENT[verdict.securedComparison?.betterPath === "secured"
    ? (verdict.securedComparison.secured.collateralType === "property" ? "loan_against_property" : "gold_loan")
    : "personal_loan"] ?? 2;
  let aprEstimate: number | null = null;
  if (safePrincipal > 0 && safeAmount.tenureMonths > 0) {
    try {
      const emi = calculateEMI(safePrincipal, midRate, safeAmount.tenureMonths);
      const result = calculateAPR(safePrincipal, midRate, feePercent, safeAmount.tenureMonths, emi);
      aprEstimate = Math.round(result.aprPercent * 100) / 100;
    } catch {
      // APR calculation can fail for edge cases — silently omit
    }
  }

  // --- Key rationale points (pick the 2–3 strongest signals) ---
  const keyPoints: string[] = [];
  if (verdict.decidingFactor) keyPoints.push(verdict.decidingFactor);
  if (stress.value.incomeDropBreach) {
    keyPoints.push("A 20% income drop would breach your safe EMI ceiling — build in some buffer.");
  }
  if (stress.value.rateRiseBreach) {
    keyPoints.push("A 2pp rate rise would push your EMI above your safe ceiling — consider locking a fixed rate.");
  }
  if (lenderQuoteComparison?.verdict === "above_fair_range") {
    keyPoints.push(`The lender's quoted rate is above your fair range — worth negotiating down by ~${lenderQuoteComparison.gapPercentagePoints} percentage points.`);
  }

  // --- Questions to ask the lender ---
  const questionsToAsk: string[] = [
    "What's the total processing fee, and is it deducted from the disbursal or added to the loan?",
  ];
  if (lenderQuoteComparison?.verdict === "above_fair_range") {
    questionsToAsk.push("Can you match the lower end of my fair rate range?");
  }
  if (aprEstimate !== null) {
    questionsToAsk.push(`What's the effective APR including all fees? (My estimate: ~${aprEstimate}%)`);
  }
  if (verdict.securedComparison) {
    questionsToAsk.push("Can you offer better pricing if I bring collateral?");
  }
  questionsToAsk.push("Is the rate fixed or floating? If floating, what's the reset frequency?");

  // Best confidence among the key outputs
  const overallConfidence = safeAmount.confidence;

  return (
    <div className="screen">
      <div className="centered-statement">
        <p className="eyebrow-plain">Your</p>
        <h1>Negotiation Card</h1>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          A summary of your borrowing position — use it when talking to lenders.
        </p>
      </div>

      {/* Key numbers */}
      <div className="ledger" style={{ marginTop: "1.5rem" }}>
        <LedgerRow
          label="Recommended amount"
          value={safePrincipal > 0
            ? `${formatINR(safeAmount.value.low)}–${formatINR(safeAmount.value.high)}`
            : "₹0"
          }
        />
        <LedgerRow
          label="Safe EMI ceiling"
          value={formatINR(affordability.value)}
        />
        <LedgerRow
          label="Fair rate range"
          value={`${fairRate.value.low}%–${fairRate.value.high}%`}
        />
        {aprEstimate !== null && (
          <LedgerRow
            label="Approx. APR (incl. fees)"
            value={`~${aprEstimate}%`}
          />
        )}
      </div>

      {/* Lender quote comparison */}
      {lenderQuoteComparison && (
        <div style={{ marginTop: "1.2rem" }}>
          <LenderQuoteBlock comparison={lenderQuoteComparison} />
        </div>
      )}

      {/* Key points */}
      <div style={{ marginTop: "1.5rem" }}>
        <h3>Key things to know</h3>
        <ul style={{ paddingLeft: "1.2rem", margin: "0.5rem 0" }}>
          {keyPoints.slice(0, 3).map((point, i) => (
            <li key={i} style={{ marginBottom: "0.5rem", fontSize: "0.95rem" }}>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Questions to ask */}
      <div style={{ marginTop: "1.5rem" }}>
        <h3>Questions to ask your lender</h3>
        <ol style={{ paddingLeft: "1.2rem", margin: "0.5rem 0" }}>
          {questionsToAsk.map((q, i) => (
            <li key={i} style={{ marginBottom: "0.5rem", fontSize: "0.95rem" }}>
              {q}
            </li>
          ))}
        </ol>
      </div>

      {/* Confidence */}
      <div style={{ marginTop: "1.5rem" }}>
        <ConfidenceTag level={overallConfidence} />
      </div>

      {/* Navigation */}
      <div style={{ marginTop: "2rem" }}>
        <button type="button" className="btn-primary" onClick={onBackToResults}>
          ← Back to full results
        </button>
        <button type="button" className="btn-secondary" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </div>
  );
}
