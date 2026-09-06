# Flow

The actual execution path, one answer at a time.

```
User answers a question
      │
      ▼
Reducer updates BorrowerProfile + answeredIds
      │
      ▼
getNextQuestion(profile, answeredIds)  ──▶  next Question shown, or null (all applicable Qs answered)
      │
      ▼
All four output functions re-run against the current (partial) profile:
      │
      ├─▶ calculateStabilityTier(profile)
      │         │
      │         ▼
      ├─▶ calculateAffordability(profile, stabilityTier)         → safe EMI ceiling
      ├─▶ calculateLikelySanction(profile, stabilityTier)        → lender-side number
      ├─▶ calculateFairRate(profile, stabilityTier)              → {low, high} band
      │         │
      │         ▼
      ├─▶ calculateSafeBorrowingAmount(safeEmi, fairRate, tenure) → principal
      ├─▶ calculateEMI(principal, rate, tenure)                   → EMI at chosen tenure(s)
      ├─▶ calculateAPR(principal, rate, fee, tenure)              → all-in effective cost
      ├─▶ calculateStressScenario(profile, results)               → income-drop / rate-rise breach check
      │
      ▼
calculateConfidence(profile, answeredIds)  → feeds back INTO the range-producing
                                              functions above (this is why the
                                              diagram shows it after them but it
                                              conceptually gates their width —
                                              implemented as a shared input computed
                                              once per render, passed down)
      │
      ▼
getBorrowingVerdict(profile, all results above) → borrow / borrow_less / dont_borrow + deciding factor
      │
      ▼
Results page renders: verdict, O2 (two numbers, labelled), O3 (band + APR + fee impact
+ comparison to lenderQuotedRate if given), O4 (EMI ceiling + tenure trade-off + stress case)
      │
      ▼
Negotiation Card = a formatted subset of the same result object:
  recommended amount, safe EMI ceiling, fair rate range, approx APR,
  top 2–3 reasons (from the rationale strings already produced), confidence
  label, and a short list of questions to ask the lender (templated from
  which factors most affected the borrower's band, e.g. "ask about the
  processing fee" if fee materially widened the APR gap).
```

**Nothing on the Results page or Negotiation Card page computes anything.**
Both are pure rendering of the same output object produced by `src/rules/`.
If a number looks wrong, the fix is in `src/rules/` or `src/data/`, never in
a page component.
