import type { ConfidenceLevel } from "../types/borrower";

const LABEL: Record<ConfidenceLevel, string> = {
  high: "confidence: high",
  medium: "confidence: medium — some answers are missing or uncertain",
  low: "confidence: low — this range is wide because several answers are missing",
};

export function ConfidenceTag({ level }: { level: ConfidenceLevel }) {
  return (
    <span className="confidence" data-level={level}>
      <span className="dot" />
      {LABEL[level]}
    </span>
  );
}
