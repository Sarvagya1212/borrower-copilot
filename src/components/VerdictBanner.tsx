import type { BorrowingVerdict } from "../types/borrower";

const HEADLINE: Record<BorrowingVerdict, string> = {
  borrow: "Borrow",
  borrow_less: "Borrow less than you asked for",
  dont_borrow: "Don't borrow right now",
};

const SIGNAL_CLASS: Record<BorrowingVerdict, string> = {
  borrow: "opportunity",
  borrow_less: "gold",
  dont_borrow: "warn",
};

export function VerdictBanner({
  verdict,
  decidingFactor,
  rationale,
}: {
  verdict: BorrowingVerdict;
  decidingFactor: string;
  rationale: string;
}) {
  return (
    <div className={`signal-block ${SIGNAL_CLASS[verdict]} centered-statement`}>
      <p className="eyebrow-plain">Our read on your situation</p>
      <h1>{HEADLINE[verdict]}</h1>
      <p style={{ maxWidth: "none" }}>{decidingFactor}</p>
      <p className="rationale" style={{ maxWidth: "none", textAlign: "left" }}>
        {rationale}
      </p>
    </div>
  );
}
