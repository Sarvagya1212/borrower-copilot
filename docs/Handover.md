# Handover

## Done
- Project scaffolded: Vite + React + TypeScript, Vitest added as the only extra
  dependency.
- `src/{components,pages,rules,calculations,data,types,utils,tests}/` created.
- `src/types/borrower.ts` written and typechecking — the shared contract for
  the rule engine and the question flow (BorrowerProfile, Question schema with
  mandatory `affects`, CalculationResult<T> wrapper, CreditScoreInfo as a
  tagged union so "unknown" can never collapse to a number).
- `docs/Constraints.md`, `docs/Decisions.md` (4 decisions logged),
  `docs/Architecture.md`, `docs/Flow.md` written.
- `RULES.md` first draft written — all FOIR/safe-EMI/sanction/rate-band/
  processing-fee/APR/stress/confidence/missing-data rules tabled with
  value, reasoning, and source-or-judgement. Rate bands for personal loan,
  LAP, and gold loan are grounded in a same-session web search (cited,
  dated); business-loan and two-wheeler-loan bands are flagged as the
  weakest-evidenced rows (pure judgement, no clean source found).
- `docs/Test-Checklist.md` and `docs/Rollback.md` written (checklist mostly
  unchecked — nothing to test yet, no rule-engine code exists).

## In progress
- Nothing mid-flight. Phase 1 (foundation) is complete.

# Handover

## Done
- **Phase 2 (rule engine):** all of O1-O4 implemented, tested, and
  consolidated behind `runFullAssessment` in `src/rules/assemble.ts`.
- **Phase 3 (adaptive question flow):** `src/data/questions.ts` (17
  questions — 10 must, 7 gated additional) and `src/rules/questionFlow.ts`
  (`getNextQuestion`, `getApplicableQuestions`, `getQuestionFlowProgress`).
- **Closed a real gap found while designing the question registry, before
  writing it:** six fields already existed on `BorrowerProfile`
  (`loanExpectedToGenerateIncome`, `expectedMonthlyIncomeFromLoan`,
  `emergencySavingsMonths`, `hasCoApplicant`/`coApplicantMonthlyIncome`,
  `creditCardUtilizationPercent`, `lenderQuotedRate`) that no rule function
  actually read — building questions for them would have violated the
  brief's own "every question must move an output" rule. All six are now
  wired in with tests: co-applicant income joins the household income base;
  emergency savings adjusts the subsistence-floor buffer; high credit-card
  utilization pulls back an otherwise-good score; the borrower's explicit
  productive-purpose confirmation overrides the purpose-based default; and
  a new `compareToLenderQuote` helper gives the lender-quote field a real
  consumer (feeding the eventual Negotiation Card).
- 126 tests passing across 15 files. Full project typechecks clean.
- `RULES.md` updated with every new threshold (emergency-savings multiplier,
  credit-card utilization threshold, productive-purpose override).

## In progress
- Nothing mid-flight. Phases 2 and 3 are functionally complete.

## Known issues
- **"Don't borrow" verdict can still show a positive safe-amount number**
  (Anita: ~₹8,851–9,917 safe amount alongside a "don't borrow" verdict) —
  still a Phase 4 (UI) presentation decision, unchanged from last update.
- Business-loan and two-wheeler-loan rate bands remain the weakest-evidenced
  rows in `RULES.md`.
- Home loan remains explicitly unmodeled.
- The question registry's `hasCreditCard` question is a pure gating
  question (doesn't itself move a number) — tagged `affects: ['fair_rate']`
  since it gates a question that does, with a comment explaining the
  pragmatic choice. Worth a second look if this feels like it's stretching
  the "every question moves an output" rule too far.

## Next step
Phase 4 — the UI. Build the question-flow screen (driven by
`getNextQuestion`/`getQuestionFlowProgress`), the results screen (rendering
`runFullAssessment`'s output — always ranges, always with rationale and
confidence, never a bare number), and the Negotiation Card (rendering
`verdict.securedComparison` and `lenderQuoteComparison` when present). This
is also where the "don't borrow but here's a number" presentation decision
needs resolving.

## Watch out for
- Keep using `runFullAssessment` as the single pipeline entry point — do
  not re-wire `calculateSafeBorrowingAmount`/`getBorrowingVerdict`/etc.
  directly from a page component. That's exactly how the Ravi gap
  happened before Decision D5.
- When building the question-flow UI, remember must-tier questions are
  never gated (`appliesIf` is always undefined for them) — if a future must
  question needs gating, it should probably move to the additional tier
  instead, per the registry's own structural test.
- `creditScore` and the collateral fields are the only multi-field/typed
  inputs in the registry (a tagged union and a small cluster of related
  fields, respectively) — they'll need slightly richer input widgets than
  the simple text/number/boolean fields everything else uses.
