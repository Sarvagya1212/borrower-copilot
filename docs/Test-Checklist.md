# Test-Checklist

Nothing on this list is checked off until it has actually been run in this
session. "Looks right" is not a pass.

## Build & typecheck
- [x] `npm install` completes clean
- [x] `npx tsc --noEmit` passes on `src/types/borrower.ts`
- [ ] `npm run build` produces a working production bundle
- [x] Full-project typecheck passes with rule engine in place (UI not yet built)

## Unit tests (rule engine)
- [x] `calculateEMI` — standard cases + zero-rate edge case
- [x] IRR/APR solver — converges and matches a hand-calculated example
- [x] `calculateStabilityTier` — all five branch cases
- [x] `calculateAffordability` — FOIR path, subsistence-floor path, bounce reduction, and confirms the floor wins when the two disagree
- [x] `calculateLikelySanction` — documented vs undocumented income base, income-multiple cap, LTV path
- [x] `calculateFairRate` — all rate-tier bands, unknown-score widening
- [x] `calculateStressScenario` — income-drop breach detection, rate-rise breach detection, zero-principal edge case (regression)
- [x] `calculateConfidence` — weighting logic covered via each rule function's own confidence tests (no single standalone function — confidence is computed per-calculation and combined via `combineConfidence`/`capConfidence`, which are directly tested)
- [x] `getBorrowingVerdict` — bounce overrides productive-purpose framing (the Anita case), zero/negative safe EMI forces "don't borrow", secured-vs-unsecured comparison (the Ravi case)

## Structural checks
- [x] Every `Question` in the registry has a non-empty `affects` array (automated test)
- [x] No rate/sanction/safe-amount function returns a bare number instead of a `CalculationResult`

## Persona runs (Phase 5)
- [x] Priya — full run via `runFullAssessment`, verdict "borrow" within ₹17.4–19.1L safe range, confirmed by both automated tests and manual inspection
- [x] Ravi — full run, confirms sanction-vs-safe gap surfaces AND now correctly drives the verdict; secured LAP alternative (₹16.2–19.5L at 8.3–12.75%) comfortably covers his ₹15L ask, comparison visible
- [x] Anita — full run, confirms bounce + high-cost-debt combination correctly produces "don't borrow" and is named as the deciding factor over the stated productive purpose
- [ ] Formal written persona documentation (questions asked/skipped, full narrative) — deferred to Phase 5 proper, once the question flow exists to generate a real "questions asked" list

## Edge cases (Phase 6)
- [x] Very low income / no income at all (caught the zero-principal stress-test crash this way)
- [ ] Very high income
- [x] High existing EMI (near/over FOIR ceiling already) — covered in affordability tests
- [x] No credit score (unknown) vs. never taken formal credit (distinct paths) — covered in creditRiskTier tests
- [x] Excellent credit score
- [x] Recent EMI bounce
- [x] Unstable/seasonal income
- [x] Missing household expenses (must-question skipped) — covered in affordability tests
- [x] Requested amount far above safe affordability (Ravi, pre-fix) / far above likely sanction
- [ ] Productive business loan case (business_loan product specifically, distinct from the vehicle-for-income case already covered)
- [x] Discretionary borrowing case (Priya, wedding)
- [x] Rate-increase stress breach
- [x] Income-reduction stress breach

## UI
- [ ] Responsive / usable on a narrow mobile viewport
- [ ] No range is ever rendered as a single point number
- [ ] Confidence label visible alongside every ranged output
