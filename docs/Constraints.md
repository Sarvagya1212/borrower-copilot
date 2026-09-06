# Constraints

Boundaries the app must respect at all times. If a future change violates one
of these, that change is wrong, not this document.

| Constraint | Detail |
|---|---|
| No backend | Everything runs client-side. No server, no API calls to any lending or credit service. |
| No persistent personal data | Borrower answers live only in in-memory React state for the session. No localStorage, no cookies, no analytics of answer content. Refreshing the page clears everything, by design. |
| No credit bureau integration | Credit score is a self-reported optional field (`CreditScoreInfo`), never fetched or verified. |
| No login | No accounts, no identity of any kind. |
| Lending rules stay out of the UI | All judgement (thresholds, bands, verdict logic) lives in `src/rules` and `src/calculations`, as pure functions with no React imports. Components only call these functions and render the returned `CalculationResult<T>`. |
| No unsupported financial claims | Every number shown to the borrower must trace to a `CalculationResult` with a `rationale` and a `sourceOrJudgement`. Rate bands and thresholds not backed by a cited source are explicitly marked "my judgement" in `RULES.md` — never presented as fact. |
| No invented market rates | Where current market data was findable (see `RULES.md`), it's cited with a date. Where it wasn't, the band is marked as an estimate, not a live quote, and the borrower is told to verify with the lender. |
| Unknown is never zero | A missing or "I don't know" answer (e.g. credit score) must never be coerced into a default numeric value. It is modelled as its own state and its own risk tier. |
| No unnecessary dependencies | Stack is Vite + React + TypeScript + Vitest. Anything beyond that needs a stated reason in `Decisions.md` before it's added. |
| Every additional question must move an output | Enforced structurally: `Question.affects` must be non-empty, checked by a test in `src/tests`. |
