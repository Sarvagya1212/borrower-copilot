# RULES.md — Borrower Copilot Rule Table

Status: **first draft**, written before the rule engine code (Phase 1). Will be
cross-checked against persona runs in Phase 5 and adversarial cases in Phase 6;
any number that changes as a result gets a dated note here, not a silent edit.

Every row states: **Rule/Threshold · Value · Why · Source or "my judgement."**
Where a live web search turned up current market data, it's cited with today's
date (2026-09-05) and labelled as *indicative, not a live quote*. Where it
didn't, or where a synthesis was needed, it's marked "my judgement" — no row
in this table pretends to more certainty than it has.

## 1. Stability tier

| Rule | Value | Why | Source |
|---|---|---|---|
| Salaried, tenure ≥ 1 year | Tier = **stable** | Established employment income, lowest income-continuity risk of the three tiers | My judgement |
| Salaried, tenure < 1 year | Tier = **moderate** | Probation-adjacent risk; income is real but shorter track record | My judgement |
| Self-employed (documented), business age ≥ 2 years | Tier = **moderate** | Documented but inherently more income-variable than salaried | My judgement |
| Self-employed (documented), business age < 2 years | Tier = **volatile** | New business, weak track record | My judgement |
| Informal/gig income, or `incomeIsSeasonalOrVolatile = true` | Tier = **volatile** | Least predictable income stream of the three | My judgement |

## 2. Safe EMI ceiling (borrower-side affordability — the number the brief calls "borrower's safe/affordable amount")

| Rule | Value | Why | Source |
|---|---|---|---|
| FOIR ceiling, stable tier | **50%** of net monthly income (all obligations incl. new EMI) | Common upper bound cited across Indian lender FOIR practice for well-placed salaried borrowers | My judgement, informed by market convention (see §4) |
| FOIR ceiling, moderate tier | **40%** | More conservative for shorter track record / documented-but-variable income | My judgement |
| FOIR ceiling, volatile tier | **30%** | Informal/seasonal income needs the widest margin of safety | My judgement |
| Subsistence floor (hard backstop) | `safeEMI ≤ netIncome − essentialExpenses − existingEMI − buffer` where **buffer = 10% of net income × emergency-savings multiplier** | A FOIR percentage alone can look affordable while leaving too little absolute rupee residual for a low-income household — this floor catches that (see Decision D2) | My judgement |
| Emergency-savings buffer multiplier | ≥3 months savings → buffer ×0.5; <1 month → buffer ×1.5; otherwise ×1 | A borrower with a real cash cushion needs less built-in safety margin; one with none needs more | My judgement |
| Household income base | Net income + co-applicant's income, **only if `hasCoApplicant` is explicitly true** | Combined household income is a real affordability signal; not added unless the borrower actively confirms a co-applicant, to avoid double-counting or assuming one exists | My judgement — currently applied to the borrower-side safe amount only, not to lender sanction sizing, since lenders' co-applicant policies vary too much to model generically |
| **Final safe EMI** | `min(FOIR-based figure, subsistence-floor figure)` | Always the more conservative of the two | My judgement |
| Recent payment bounce (last 6–12 months) | Safe EMI further reduced by **20%** and confidence capped at *low* | A recent bounce is the strongest available real-world signal of current repayment strain — outweighs an otherwise-clean profile | My judgement |
| Known upcoming large expense | Subtracted from disposable income before the buffer is applied | Avoids recommending an EMI that collides with a known one-off cost | My judgement |

## 3. Likely lender sanction (bank/NBFC-side number — separate function, can be higher *or* lower than safe EMI, see Decision D1)

| Rule | Value | Why | Source |
|---|---|---|---|
| Income base used | Salaried → `netMonthlyIncome`. Self-employed/informal → `documentedAnnualIncome / 12` if provided, else a steep haircut (see below) | Formal lenders size loans on **documented** income, not stated cash income — this is exactly the gap that can make Ravi's real capacity exceed his "sanctionable" amount | My judgement |
| No documented income provided (informal/gig, no ITR) | Documented income base assumed at **50%** of stated cash income, flagged as a wide-uncertainty estimate | Without paperwork, formal lenders will heavily discount or decline; this reflects that reality rather than the borrower's real cash flow | My judgement — this is a placeholder assumption, one of the weakest-evidenced rows in this table |
| Lender FOIR, salaried + score known ≥ 750 | **55%** | Best-priced segment gets the most generous lender-side FOIR in common practice | My judgement, informed by market convention |
| Lender FOIR, salaried + score 650–749, or unknown score | **45%** | Mid-tier caution | My judgement |
| Lender FOIR, score < 650, or bounce present | **35%**, and may be effectively **0** (decline) if a bounce is recent | Lenders price and size much more conservatively for weaker repayment signals | My judgement |
| Income multiple cross-check (personal loan, salaried) | Sanction capped at roughly **10–15× net monthly income** | Widely cited convention among Indian personal-loan lenders for sizing unsecured credit | Web search, 2026-09-05 — indicative, not a specific lender's published policy |
| Income multiple cross-check (self-employed/documented, personal loan) | Capped at roughly **6–8×** documented monthly income | Same convention applied more conservatively given weaker documentation | My judgement (extrapolated from the salaried convention, not independently sourced) |
| Secured product available (collateral declared, unencumbered) | Sanction recalculated on **loan-to-value** instead of income multiple: **~75%** of gold value; **~55%** of property value (conservative) | Gold-loan LTV near this level is a commonly cited industry/regulatory norm; property LTV is a conservative mid-point of typical LAP practice | Gold: commonly cited norm, not verified against a current circular this session — treat as approximate. Property: my judgement |
| **Final likely sanction** | `min(FOIR-based figure, income-multiple figure)`, or LTV-based figure when a usable collateral route exists and is presented as an *alternative*, not a replacement | Presents the borrower with the realistic path (e.g. Ravi: unsecured personal loan sanction on paper income vs. LAP on his shop) rather than one number | My judgement |

## 4. Fair interest-rate bands (illustrative market bands, sourced 2026-09-05, not a live quote — always compared against the lender's actual quote)

| Product / risk tier | Band | Why | Source |
|---|---|---|---|
| Personal loan, salaried, score ≥ 750 | **10.5% – 14.5%** | Bank-tier pricing for the strongest documented profiles | Web search, 2026-09-05 (bank-published indicative ranges) |
| Personal loan, score 650–749 | **14% – 18%** | Mid-tier bank/NBFC pricing | My judgement, interpolated from the sourced band above and general NBFC ranges found |
| Personal loan, score unknown (no bureau signal, no bounce, no history) | **15% – 20%** | Deliberately shifted up and widened relative to a known-good score — genuine uncertainty, not assumed bad credit (unknown ≠ 300) | My judgement |
| Personal loan, score < 650 or recent bounce | **20% – 28%** | NBFC/fintech higher-risk pricing band | Web search, 2026-09-05 (general NBFC/fintech range), widened by judgement for the bounce case specifically |
| Loan against property (LAP), documented/good profile | **8.3% – 12.75%** | Secured lending prices meaningfully below unsecured personal loans | Web search, 2026-09-05 (bank-published range) |
| Loan against property, self-employed/less-documented | **12% – 16%** | Same secured discount, but wider and higher for weaker documentation | My judgement (extension beyond the sourced band, not independently verified) |
| Gold loan | **8.5% – 11.9%**, commonly concentrated **8.7% – 9.5%** | Shortest-tenure, most liquid collateral, typically cheapest secured product | Web search, 2026-09-05 |
| Business loan, self-employed/informal, unsecured | **14% – 24%** | No clean current source found this session; treated as analogous to NBFC personal-loan pricing for a similar risk profile | My judgement — flagged as the weakest-evidenced rate band in this table |
| Two-wheeler loan | **10% – 18%** | No clean current source found this session; asset-backed retail lending, priced between gold-loan and unsecured personal-loan bands | My judgement |
| Gold loan pricing ignores credit-risk tier | The gold-loan band applies **regardless of credit score/bounce history** | Gold loans price primarily on the value and purity of the pledged collateral, not the borrower's credit profile — this is a deliberate simplification, not an oversight | My judgement |
| Home loan | **Not modeled** in this build | None of the three required personas need it; rather than fabricate a band, the app states this plainly and offers the loan-against-property band as a rough, explicitly-labeled stand-in at low confidence | Honesty-about-limits requirement |
| O3 confidence cap for unknown/thin-file credit | Confidence for the fair-rate output is capped at **medium**, even if every other question is answered, whenever credit score is unknown or "never taken formal credit" | A genuine bureau-side unknown shouldn't be erased by unrelated answers being complete — the rate band itself is already widened for this case, and the confidence label should say so too | My judgement |

## 5. Processing fees (assumed for APR illustration — always flagged as adjustable once the borrower has an actual quote)

| Product | Assumed fee | Source |
|---|---|---|
| Personal loan | **2.0%** of principal | My judgement synthesis of commonly disclosed ranges (typically 0.5%–2.5% across lenders) |
| Loan against property | **1.0%** | My judgement |
| Gold loan | **0.5%** (often a smaller flat amount in practice) | My judgement |
| Business loan | **2.0%** | My judgement |
| Two-wheeler loan | **1.5%** | My judgement |

## 6. APR / all-in cost methodology

| Rule | Detail | Source |
|---|---|---|
| Method | Effective annual cost computed from the **real cash-flow stream**: disbursal = principal − fee (fee assumed deducted upfront), then monthly EMI outflows at the nominal rate over the tenure. Solved as an IRR (Newton-Raphson), then annualized. | My judgement — this is a standard IRR/effective-rate technique, not a novel method, applied here rather than a rough "rate + fee/tenure" add-on so the number is actually defensible |
| Key assumption to flag to the borrower | Assumes the fee is deducted from disbursal, not financed into the loan amount. Some lenders do the latter, which changes the real APR the borrower experiences. **Borrower should confirm this with the actual lender.** | My judgement / explicit limitation |

## 7. Stress scenario

| Rule | Value | Why | Source |
|---|---|---|---|
| Income-drop stress | **−20%** of net monthly income, re-check FOIR breach against existing + new EMI | Round, explainable magnitude — not an RBI-mandated figure, a deliberately simple stress case | My judgement |
| Rate-rise stress | **+2 percentage points**, recompute EMI on the same principal/tenure | Same rationale — simple, explainable, not a regulatory figure | My judgement |

## 8. Confidence methodology

| Rule | Detail | Source |
|---|---|---|
| Signal weighting | Each *must* question = weight 1. High-impact *additional* questions (bounce history, collateral value, documented income for self-employed, existing loan rates) = weight 2. Lower-impact additional questions (savings buffer, co-applicant, upcoming expense, card utilization) = weight 1. | My judgement |
| Confidence level | `answered weight ÷ applicable weight` (applicable = only questions whose `appliesIf` is true for this profile) → **≥80% = high, 50–79% = medium, <50% = low** | My judgement |
| Effect on output ranges | Lower confidence widens the fair-rate band and the sanction/safe-amount ranges by a fixed multiplier (never narrows them) — implemented inside the range-producing functions, not bolted on in the UI afterward | My judgement, per Decision D1/D2 intent |

## 9. Missing-data and unknown-credit-score treatment

| Situation | Treatment | Source |
|---|---|---|
| A *must* field is missing | The specific calculation(s) needing it widen their output range (never block it), and the missing field is listed in that result's `limitedBy` | My judgement |
| Credit score = unknown | Modeled as its own risk tier, placed between "moderate" and "high-risk" for rate-band purposes — **not** defaulted to a numeric score, and never treated as equivalent to "never taken formal credit" (that's a distinct, separately-modeled case) | Product brief requirement, implementation is my judgement |
| Credit score = never taken formal credit | Treated similarly to "unknown" for rate purposes, but flagged separately in the rationale, since a genuinely thin file is a different situation from "has a score but doesn't know it" | My judgement |
| Credit-card utilization | Utilization ≥ **80%** pulls a "good" (≥750) score back to "mid" tier for rate-band purposes | High utilization is itself a real-world risk signal independent of the score number, which may lag behind current behavior | My judgement |

## 10. Product-specific routing assumptions

| Situation | Routing suggestion | Source |
|---|---|---|
| No collateral, purpose = wedding/medical/education/travel/other | Personal loan is the natural fit; app does not suggest a secured product that doesn't exist for this borrower | My judgement |
| Owns unencumbered property or gold, requested amount is large relative to income | App surfaces the secured-product alternative (LAP or gold loan) alongside the requested product, even if the borrower asked for something else — because the rate difference is usually large enough to matter | My judgement, directly motivated by the Ravi persona |
| Purpose = income-generating vehicle or business stock/equipment | Flagged as **productive borrowing** in the verdict rationale, but this label has a **capped influence** — it does not multiply affordability, and it does not override a recent-bounce risk flag (see Decision D3) | My judgement |

## 11. Recommended tenure defaults (used to convert safe EMI into a principal, and as the O4 starting point)

| Product | Default tenure | Why | Source |
|---|---|---|---|
| Personal loan | 60 months | Common unsecured personal-loan tenure ceiling in India | My judgement |
| Gold loan | 18 months | Gold loans are typically short-tenure, liquid-collateral products | My judgement |
| Loan against property | 120 months | Secured, larger-ticket lending typically supports longer tenure | My judgement |
| Home loan | 180 months | Longest typical tenure among common retail products (though home loan itself is not modeled — see §4) | My judgement |
| Two-wheeler loan | 36 months | Matches the asset's typical usable life/financing convention | My judgement |
| Business loan | 60 months | Aligned with personal-loan-style unsecured tenure assumption | My judgement |
| Age + tenure ceiling | Age + tenure(years) ≤ **60** | Common retirement-linked tenure-capping convention among Indian lenders | My judgement — applied only when age is known, shown as a note rather than a hard block |

## 12. Borrowing verdict thresholds

| Rule | Value | Why | Source |
|---|---|---|---|
| Zero safe-EMI headroom | Verdict = **don't borrow**, unconditionally | The brief requires "don't borrow" to be a reachable outcome; this is its clearest trigger | Product brief requirement |
| High-cost existing debt threshold | An existing loan at or above **24%** is treated as distress-priced | Separates ordinary existing EMIs from clearly punitive ones (e.g. informal app-loans at 30%+) | My judgement |
| Recent bounce + high-cost existing debt | Verdict = **don't borrow** | Stabilizing existing distress debt takes priority over new borrowing, even for a stated productive purpose — the bounce/high-cost-debt signal overrides the productive-purpose framing rather than being averaged against it (Decision D3) | My judgement — this is the most subjective rule in the engine, see Decision D3 |
| Recent bounce, no known high-cost debt | Verdict = **borrow less**, capped well below the safe ceiling | A real warning sign on its own, but less severe than the combination above | My judgement |
| Requested amount vs. safe range | Verdict = **borrow less** when requested amount exceeds the safe range's high end by more than **15%** | Avoids flagging trivial overshoots as a full "borrow less," while still catching requests well beyond the safe range | My judgement |
| Productive purpose framing | Never changes the recommended amount — only the language used to describe the verdict | Decision D3: productive-purpose is a framing signal, not a multiplier on affordability | My judgement |
| Productive-purpose confirmation | If the borrower explicitly answers whether the loan will generate income, that answer **overrides** the purpose-based default (e.g. a "wedding" loan explicitly confirmed as income-generating still gets productive framing; a "vehicle for income" loan explicitly denied does not) | The purpose category is a reasonable default, but the borrower's direct answer is more informative when given | My judgement |
| Secured vs. unsecured comparison | When a secured alternative exists, its safe amount is computed independently (capped by BOTH its loan-to-value ceiling AND the safe-EMI ceiling — see Decision D6) and compared against the unsecured safe amount; the verdict uses whichever is larger, but **both are always shown side-by-side**, never silently substituted | Decision D5 — surfaced directly by running the Ravi persona end-to-end, not by unit tests in isolation | My judgement |

---

**Open items to close before Phase 5 (persona validation):** business-loan and
two-wheeler-loan rate bands are currently the weakest-evidenced rows in this
table (no clean current source found in this session's searches) — worth one
more targeted search pass, or an explicit acknowledgment in the walkthrough
that these two bands are pure judgement calls.
