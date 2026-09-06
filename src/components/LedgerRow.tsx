import type { ReactNode } from "react";

export function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ledger-row">
      <span className="label">{label}</span>
      <span className="value num">{value}</span>
    </div>
  );
}

/** A ledger row plus its rationale and confidence, for the four main
 *  O1-O4 outputs — every number here is required to come with both. */
export function RangeBlock({
  label,
  value,
  rationale,
  confidence,
  children,
}: {
  label: string;
  value: string;
  rationale: string;
  confidence: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="ledger">
      <div className="ledger-row">
        <span className="label">{label}</span>
        <span className="value num">{value}</span>
      </div>
      <p className="rationale">{rationale}</p>
      {confidence}
      {children}
    </div>
  );
}
