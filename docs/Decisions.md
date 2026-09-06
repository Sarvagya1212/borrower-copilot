# Decisions

## D1 — Separate `calculateLikelySanction` from `calculateSafeBorrowingAmount`, and allow either to exceed the other
**Reason:** A single "eligibility" number hides the exact gap the product exists to expose. For a documented-income salaried borrower the lender number is often higher than the safe number (over-lending risk). For an undocumented-cash-income self-employed borrower (Ravi), the reverse can be true — the lender number, built only on paperwork, can be *lower* than what the borrower can genuinely, safely service.
**Alternatives considered:** One blended "eligibility" figure with a risk discount applied. Rejected — it would quietly average away exactly the information the borrower most needs to see.
**Trade-off:** More surface area to explain in the UI; requires the Negotiation Card to clearly label which number is which.
**Date:** 2026-09-05

## D2 — Safe EMI ceiling is `min(FOIR-based %, income − essential expenses − existing EMI − buffer)`, not a FOIR % alone
**Reason:** A pure percentage rule can look affordable on paper while leaving an absolute rupee shortfall for low-income households (Anita). The subsistence floor is a hard backstop under the percentage rule.
**Alternatives considered:** FOIR percentage only, matching most public bank EMI calculators. Rejected as insufficiently protective for the low-income persona the brief explicitly requires the app to handle well.
**Trade-off:** Requires an essential-expenses figure to be asked as a must-question (it already is) and a subsistence-floor assumption to be documented and defended as judgement in `RULES.md`.
**Date:** 2026-09-05

## D3 — "Loan will generate income" gets capped influence on the verdict, not a multiplier on affordability
**Reason:** If a self-reported income-generation claim directly expanded the safe borrowing amount, it would be unfalsifiable — nearly every borrower would say yes. It's treated instead as something that can improve the *framing* of an already-affordable verdict, and is explicitly not allowed to override a recent-payment-bounce risk flag.
**Alternatives considered:** Let it scale affordability directly (rejected, unfalsifiable); ignore it entirely (rejected, throws away a real and brief-mandated distinction between productive and discretionary borrowing).
**Trade-off:** This is the single most subjective rule in the engine. It will be implemented as an explicit, heavily-commented function so it can be defended and changed live in the follow-up interview.
**Date:** 2026-09-05

## D4 — Vitest added as the only new dependency beyond the default Vite React-TS template
**Reason:** Rule-engine correctness is 30+20+20 = 70% of the scoring weight; it needs real, runnable tests, not manual eyeballing.
**Alternatives considered:** Jest (heavier setup with Vite); no automated tests, manual persona review only (rejected — brief explicitly asks "do not say it works without testing it").
**Trade-off:** One more dependency, justified against the "avoid unnecessary dependencies" constraint because it directly serves the highest-weighted scoring criteria.
**Date:** 2026-09-05

## D5 — Secured and unsecured safe-borrowing paths are computed independently and shown side-by-side; the verdict compares against whichever is better
**Reason:** Running the Ravi persona end-to-end (not just unit tests in isolation) surfaced that his property-secured alternative, already correctly surfaced by `calculateLikelySanction`, never fed into `calculateSafeBorrowingAmount` or `getBorrowingVerdict` — he was being told to "borrow less" via an unsecured personal loan when a materially better secured option existed. Discussed directly with the user, who chose: compute both paths, show both, let the verdict pick the better one but display the comparison rather than silently substituting one number for the other.
**Alternatives considered:** (a) secured alternative silently replaces the unsecured calculation when better — rejected, hides the trade-off (rate/tenure/collateral-risk) the borrower should actually see; (b) defer the fix entirely — rejected, this is close to the central insight the Ravi persona exists to test.
**Trade-off:** More surface area in `VerdictResult` and the eventual Negotiation Card (two ranges, two rate bands, instead of one), and `calculateSecuredSafeBorrowingAmount` duplicates some structure from `calculateSafeBorrowingAmount` (mitigated by extracting the shared tenure-resolution logic into `rules/tenure.ts`).
**Date:** 2026-09-05

## D6 — The secured safe amount is itself capped by BOTH loan-to-value AND the safe-EMI ceiling, not LTV alone
**Reason:** A large loan-to-value ceiling (e.g. Ravi's ₹24.75L against his shop) doesn't automatically mean that principal is safe to service — the EMI it implies must still fit within the borrower's safe-EMI ceiling. Computed for Ravi: the LTV ceiling alone would suggest ₹24.75L, but the EMI-based figure at LAP rates caps it closer to ₹14–17L — a materially different, more honest number. `calculateSecuredSafeBorrowingAmount` takes the lower of the two, the same min()-of-two-methods pattern already used in `calculateLikelySanction`.
**Alternatives considered:** Use the LTV ceiling directly as the secured safe amount — rejected, it would repeat exactly the "confusing lender eligibility with borrower affordability" mistake the brief explicitly warns against (rule 6), just inside the secured path instead of the unsecured one.
**Date:** 2026-09-05
