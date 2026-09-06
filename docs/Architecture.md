# Architecture

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│  src/pages/            Screen-level containers (Intro,       │
│                        QuestionFlow, Results, NegotiationCard)│
│         │ renders                                            │
│  src/components/       Presentational pieces (RangeDisplay,   │
│                        ConfidenceBadge, QuestionCard, etc.)    │
│         │ reads/writes                                       │
│  App state             { profile: BorrowerProfile,            │
│                          answeredIds: (keyof BorrowerProfile)[]}│
│         │ passed into                                        │
│  src/rules/            Judgement layer. calculateAffordability,│
│                        calculateFairRate, getBorrowingVerdict, │
│                        etc. Each returns CalculationResult<T>.│
│         │ calls                                               │
│  src/calculations/     Pure arithmetic. EMI formula, IRR/APR   │
│                        solver, ratio helpers. No lending       │
│                        judgement lives here — no thresholds,   │
│                        no bands, just math.                   │
│         │ reads constants from                                │
│  src/data/             Question registry + threshold/band      │
│                        tables (FOIR %, rate bands, stress      │
│                        magnitudes). No magic numbers outside   │
│                        this layer.                             │
└─────────────────────────────────────────────────────────────┘
```

**Rule of the boundary:** `components/` and `pages/` are never allowed to
contain a threshold, a percentage, or a lending decision. If a component
needs a number, it calls a function in `rules/` and renders the
`CalculationResult` it gets back (value, rationale, confidence,
sourceOrJudgement). This is checked by convention and code review, not by
tooling, for this project's scope.

## Data flow (also see Flow.md for the step-by-step version)

1. `src/data/questions.ts` holds the declarative `Question[]` registry.
2. The question-flow page asks `getNextQuestion(profile, answeredIds)` which
   question to show next — this function lives in `src/rules/` (it's a
   judgement/sequencing decision, not pure math) and filters the registry by
   `appliesIf(profile)`, tier (must before additional), and whether it's
   already answered.
3. Every answer updates `profile` in the reducer. After every update, the
   page recomputes all four outputs — so a borrower who stops after the
   must-questions already has a usable (wide) result; there's no separate
   "submit" step that gates the outputs.
4. Each `rules/` function reads whatever it needs from `profile`, applies
   thresholds from `src/data/`, and returns a `CalculationResult<T>`.
5. `calculateConfidence` is computed once per render, from which
   signal-bearing questions are answered, and threaded into the width of the
   rate band and sanction/safe-amount ranges (wider when confidence is lower —
   enforced inside the range-producing functions themselves, not bolted on
   afterwards in the UI).
6. The Results page and the Negotiation Card page both render from the same
   computed output object — the Card is a reformatting/subset of Results, not
   a second calculation path.

## State ownership

Single reducer at the top-level page container (`useReducer`), holding
`{ profile, answeredIds }`. No global state library — the tree is shallow
enough (Intro → QuestionFlow → Results → Card) that prop drilling one level
is simpler than adding a dependency, per the "avoid unnecessary dependencies"
constraint.

## Why no backend

All computation is deterministic and client-side; there is nothing here that
needs a server (no bureau call, no persistence, no auth). Adding one would
violate the brief and Constraints.md for no benefit.
