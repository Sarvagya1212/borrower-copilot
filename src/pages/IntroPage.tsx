/**
 * Intro screen — the first thing a borrower sees. Centered, clean,
 * deliberately calm. One CTA.
 */
export function IntroPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="screen" style={{ justifyContent: "center" }}>
      <div className="centered-statement">
        <p className="eyebrow-plain">Borrower Copilot</p>
        <h1>Understand your borrowing position — before the lender does</h1>
      </div>
      <p>
        Answer a few questions about your income, expenses, and the loan you're
        considering. We'll tell you how much you can safely borrow, what a fair
        interest rate looks like, and what to watch out for — with full
        transparency about where every number comes from.
      </p>
      <p className="muted">
        Everything runs in your browser. No data is sent anywhere, no account
        required, nothing is saved. Takes about 3 minutes.
      </p>
      <button type="button" className="btn-primary" onClick={onStart}>
        Start assessment
      </button>
    </div>
  );
}
