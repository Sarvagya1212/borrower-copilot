import type { FullAssessment } from "../rules/assemble";
import { formatINR } from "../utils/formatCurrency";
import { VerdictBanner } from "../components/VerdictBanner";
import { RangeBlock } from "../components/LedgerRow";
import { ConfidenceTag } from "../components/ConfidenceTag";
import { SecuredComparisonBlock } from "../components/SecuredComparisonBlock";
import { StressScenarioBlock } from "../components/StressScenarioBlock";
import { LenderQuoteBlock } from "../components/LenderQuoteBlock";

/** Human-readable labels for the `limitedBy` field names that the rule
 *  engine reports, so the UI shows "bounce history" not "hadPaymentBounceRecently". */
const FIELD_LABELS: Record<string, string> = {
  creditScore: "credit score",
  loanType: "loan type",
  hadPaymentBounceRecently: "bounce history",
  netMonthlyIncome: "income",
  existingMonthlyEmiTotal: "existing EMIs",
  essentialMonthlyExpenses: "essential expenses",
  documentedAnnualIncome: "documented income",
  collateralEstimatedValue: "collateral value",
};
function humanize(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").toLowerCase().trim();
}

/**
 * Results page — renders the full runFullAssessment output. Nothing here
 * computes anything — every number comes from the assessment prop, per
 * the Architecture.md boundary rule.
 *
 * Presentation decision for "don't borrow + positive safe amount": the
 * number is still shown, but visually muted with an explicit note that
 * the recommendation is to not borrow, so the borrower sees what *could*
 * be borrowed while understanding why they shouldn't right now.
 */
export function ResultsPage({
  assessment,
  onGoToNegotiationCard,
  onStartOver,
}: {
  assessment: FullAssessment;
  onGoToNegotiationCard: () => void;
  onStartOver: () => void;
}) {
  const { verdict, safeAmount, sanction, fairRate, stress, lenderQuoteComparison } = assessment;
  const isDontBorrow = verdict.verdict === "dont_borrow";

  // Collect all limitedBy entries for the "narrow your results" note
  const allLimitedBy = Array.from(
    new Set([
      ...(safeAmount.limitedBy ?? []),
      ...(fairRate.limitedBy ?? []),
    ]),
  );

  return (
    <div className="screen">
      {/* 1. Verdict banner — the one bold centered statement */}
      <VerdictBanner
        verdict={verdict.verdict}
        decidingFactor={verdict.decidingFactor}
        rationale={verdict.rationale}
      />

      {/* 2. Safe borrowing amount */}
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Your safe borrowing range</h2>
        {isDontBorrow && safeAmount.value.high > 0 && (
          <p className="muted" style={{ fontSize: "0.92rem" }}>
            This is what you could technically borrow, but we recommend against
            it right now — the verdict above explains why.
          </p>
        )}
        <RangeBlock
          label="Safe amount"
          value={
            isDontBorrow && safeAmount.value.high > 0
              ? `(${formatINR(safeAmount.value.low)}–${formatINR(safeAmount.value.high)})`
              : safeAmount.value.high > 0
                ? `${formatINR(safeAmount.value.low)}–${formatINR(safeAmount.value.high)}`
                : "₹0"
          }
          rationale={safeAmount.rationale}
          confidence={<ConfidenceTag level={safeAmount.confidence} />}
        />
      </section>

      {/* 3. Likely lender sanction */}
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Likely lender sanction</h2>
        <RangeBlock
          label="Lender sanction"
          value={`${formatINR(sanction.value.low)}–${formatINR(sanction.value.high)}`}
          rationale={sanction.rationale}
          confidence={<ConfidenceTag level={sanction.confidence} />}
        />
      </section>

      {/* 4. Fair rate band */}
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Fair interest rate</h2>
        <RangeBlock
          label="Fair rate"
          value={`${fairRate.value.low}%–${fairRate.value.high}%`}
          rationale={fairRate.rationale}
          confidence={<ConfidenceTag level={fairRate.confidence} />}
        />
      </section>

      {/* 5. Secured comparison (only if collateral was evaluated) */}
      {verdict.securedComparison && (
        <section style={{ marginTop: "1.5rem" }}>
          <SecuredComparisonBlock comparison={verdict.securedComparison} />
        </section>
      )}

      {/* 6. Stress scenario */}
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Stress test</h2>
        <StressScenarioBlock stress={stress} />
      </section>

      {/* 7. Lender quote comparison */}
      {lenderQuoteComparison && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2>Your lender's quoted rate</h2>
          <LenderQuoteBlock comparison={lenderQuoteComparison} />
        </section>
      )}

      {/* 8. limitedBy note */}
      {allLimitedBy.length > 0 && (
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "1.5rem" }}>
          Some ranges are wider than they need to be because you haven't answered:{" "}
          {allLimitedBy.map(humanize).join(", ")}. Going back and answering those would narrow your results.
        </p>
      )}

      {/* Navigation */}
      <div style={{ marginTop: "2rem" }}>
        <button type="button" className="btn-primary" onClick={onGoToNegotiationCard}>
          Get your Negotiation Card
        </button>
        <button type="button" className="btn-secondary" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </div>
  );
}
