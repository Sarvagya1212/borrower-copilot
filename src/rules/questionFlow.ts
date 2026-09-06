import type { BorrowerProfile, Question } from "../types/borrower";
import { QUESTIONS } from "../data/questions";

/**
 * All questions currently applicable to this profile (answered or not),
 * in registry order — must-tier questions first, then additional. Used by
 * getNextQuestion below, and useful on its own for progress-indicator UI
 * ("3 of ~8 must-questions answered").
 */
export function getApplicableQuestions(profile: BorrowerProfile): Question[] {
  return QUESTIONS.filter((q) => q.appliesIf === undefined || q.appliesIf(profile));
}

/**
 * Returns the next question to ask, or null once every applicable question
 * (must and additional) has been answered or, for additional questions
 * only, explicitly skipped. A field counts as "answered" if it's not
 * `undefined` on the profile — false, 0, and empty-but-defined values all
 * count, since those are real answers, not missing ones.
 *
 * Must-tier questions are always exhausted before any additional question
 * is offered, because a borrower who stops after the must-tier should
 * already have a complete (if wide) set of four outputs. Must-tier
 * questions cannot be skipped — `skippedIds` only affects additional ones,
 * since the whole point of the must/additional split is that the must set
 * is the actual minimum.
 */
export function getNextQuestion(
  profile: BorrowerProfile,
  skippedIds: ReadonlySet<keyof BorrowerProfile> = new Set(),
): Question | null {
  const applicable = getApplicableQuestions(profile);
  const mustUnanswered = applicable.find((q) => q.tier === "must" && profile[q.id] === undefined);
  if (mustUnanswered) return mustUnanswered;

  const additionalUnanswered = applicable.find(
    (q) => q.tier === "additional" && profile[q.id] === undefined && !skippedIds.has(q.id),
  );
  return additionalUnanswered ?? null;
}

export interface QuestionFlowProgress {
  mustAnswered: number;
  mustTotal: number;
  additionalAnswered: number;
  additionalApplicableTotal: number;
  /** True once every applicable must-question has been answered — the
   *  point at which all four outputs become available, even if wide. */
  hasMinimumForOutputs: boolean;
}

/** Progress summary for a "you can stop here, or keep going to narrow your
 *  results" UI affordance. */
export function getQuestionFlowProgress(
  profile: BorrowerProfile,
  skippedIds: ReadonlySet<keyof BorrowerProfile> = new Set(),
): QuestionFlowProgress {
  const applicable = getApplicableQuestions(profile);
  const mustQuestions = applicable.filter((q) => q.tier === "must");
  const additionalQuestions = applicable.filter((q) => q.tier === "additional");

  const mustAnswered = mustQuestions.filter((q) => profile[q.id] !== undefined).length;
  const additionalAnswered = additionalQuestions.filter(
    (q) => profile[q.id] !== undefined || skippedIds.has(q.id),
  ).length;

  return {
    mustAnswered,
    mustTotal: mustQuestions.length,
    additionalAnswered,
    additionalApplicableTotal: additionalQuestions.length,
    hasMinimumForOutputs: mustAnswered === mustQuestions.length,
  };
}
