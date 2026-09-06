import type { ConfidenceLevel } from "../types/borrower";

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = { low: 0, medium: 1, high: 2 };

/** Never lets a cap raise confidence, only lower it. */
export function capConfidence(level: ConfidenceLevel, cap: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_RANK[level] <= CONFIDENCE_RANK[cap] ? level : cap;
}

/** When a result depends on two upstream results, the combined confidence
 *  can never exceed the weaker of the two — a calculation is only as
 *  certain as its least-certain input. */
export function combineConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}
