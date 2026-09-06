import type { BorrowerProfile } from "../types/borrower";
import { getNextQuestion, getQuestionFlowProgress } from "../rules/questionFlow";
import { QuestionCard } from "../components/QuestionCard";
import { ProgressIndicator } from "../components/ProgressIndicator";

/**
 * The main interactive page. Drives the adaptive question flow using
 * getNextQuestion from the rules layer. When getNextQuestion returns null
 * (all applicable questions answered or skipped), auto-advances to Results.
 *
 * NOTE: QuestionCard is keyed by question.id so React unmounts/remounts the
 * widget for each new question — this resets the sub-widget's local state
 * (selected value, typed text) cleanly without manual state juggling.
 */
export function QuestionFlowPage({
  profile,
  skippedIds,
  onAnswer,
  onSkip,
  onSeeResults,
}: {
  profile: BorrowerProfile;
  skippedIds: ReadonlySet<keyof BorrowerProfile>;
  onAnswer: (key: keyof BorrowerProfile, value: unknown) => void;
  onSkip: (key: keyof BorrowerProfile) => void;
  onSeeResults: () => void;
}) {
  const question = getNextQuestion(profile, skippedIds);
  const progress = getQuestionFlowProgress(profile, skippedIds);

  // All applicable questions answered — auto-advance
  if (!question) {
    // Use a microtask so we don't dispatch during render
    queueMicrotask(onSeeResults);
    return (
      <div className="screen" style={{ justifyContent: "center" }}>
        <div className="centered-statement">
          <p className="muted">Preparing your results…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <ProgressIndicator
        progress={progress}
        onSeeResults={progress.hasMinimumForOutputs ? onSeeResults : undefined}
      />
      <QuestionCard
        key={question.id}
        question={question}
        onAnswer={onAnswer}
        onSkip={question.tier === "additional" ? () => onSkip(question.id) : undefined}
      />
    </div>
  );
}
