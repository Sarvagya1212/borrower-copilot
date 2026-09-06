import type { QuestionFlowProgress } from "../rules/questionFlow";

/**
 * Progress bar + label for the question flow. Uses the progress-track /
 * progress-fill / progress-label CSS already in index.css — no new styles
 * needed. Once must-tier is complete, the label changes to "Refining" and
 * a "See your results" button appears.
 */
export function ProgressIndicator({
  progress,
  onSeeResults,
}: {
  progress: QuestionFlowProgress;
  onSeeResults?: () => void;
}) {
  const { mustAnswered, mustTotal, additionalAnswered, additionalApplicableTotal, hasMinimumForOutputs } = progress;

  const inAdditionalPhase = hasMinimumForOutputs;
  const answered = inAdditionalPhase ? mustTotal + additionalAnswered : mustAnswered;
  const total = inAdditionalPhase ? mustTotal + additionalApplicableTotal : mustTotal;
  const fraction = total > 0 ? answered / total : 0;

  const label = inAdditionalPhase
    ? `Refining: ${additionalAnswered} of ${additionalApplicableTotal} additional questions`
    : `Question ${mustAnswered + 1} of ${mustTotal}`;

  return (
    <div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.min(fraction * 100, 100)}%` }} />
      </div>
      <div className="progress-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{label}</span>
        {inAdditionalPhase && onSeeResults && (
          <button
            type="button"
            onClick={onSeeResults}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            See your results →
          </button>
        )}
      </div>
    </div>
  );
}
