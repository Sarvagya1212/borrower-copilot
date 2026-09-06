import { describe, it, expect } from "vitest";
import { calculateLikelySanction } from "../rules/likelySanction";
import type { BorrowerProfile } from "../types/borrower";

describe("calculateLikelySanction", () => {
  it("Ravi-shaped case: documented-income sanction lands far below his stated cash income multiple, and a property-secured alternative is surfaced", () => {
    const ravi: BorrowerProfile = {
      incomeType: "self_employed_documented",
      netMonthlyIncome: 60000, // midpoint of his 40-80k cash income range
      documentedAnnualIncome: 420000, // his ITR income — ~35,000/month
      existingMonthlyEmiTotal: 0,
      tenureYearsInJobOrBusiness: 14,
      creditScore: { status: "never_taken_formal_credit" },
      hasCollateral: true,
      collateralType: "property",
      collateralEstimatedValue: 4500000,
      collateralEncumbered: false,
    };

    const result = calculateLikelySanction(ravi);

    // Sanction is sized off documented (~35k/month) income, not his real
    // 60k/month cash flow — this is the point of the function.
    expect(result.value.high).toBeLessThan(400000);
    expect(result.rationale).toMatch(/documented/);

    // But the property-secured alternative should be substantial —
    // exactly the routing insight this persona is meant to surface.
    expect(result.securedAlternative).toBeDefined();
    expect(result.securedAlternative!.estimatedAmount).toBe(Math.round(4500000 * 0.55));
    expect(result.securedAlternative!.estimatedAmount).toBeGreaterThan(result.value.high);
  });

  it("uses a haircut on stated cash income when no documented/ITR income is given (Anita-shaped case), and flags it", () => {
    const anita: BorrowerProfile = {
      incomeType: "informal_or_gig",
      netMonthlyIncome: 28000,
      existingMonthlyEmiTotal: 0,
    };
    const result = calculateLikelySanction(anita);
    expect(result.limitedBy).toContain("documentedAnnualIncome");
    expect(result.rationale).toMatch(/haircut/);
    // Haircut base is 14,000/month — sanction should be a modest figure,
    // not anywhere close to her stated cash income treated at face value.
    expect(result.value.high).toBeLessThan(150000);
  });

  it("a salaried borrower with a good score gets a materially larger sanction than an identical-income weak-score borrower", () => {
    const base: BorrowerProfile = {
      incomeType: "salaried",
      netMonthlyIncome: 100000,
      existingMonthlyEmiTotal: 0,
    };
    const goodScore = calculateLikelySanction({
      ...base,
      creditScore: { status: "known", score: 780 },
    });
    const weakScore = calculateLikelySanction({
      ...base,
      creditScore: { status: "known", score: 600 },
    });
    expect(goodScore.value.high).toBeGreaterThan(weakScore.value.high);
  });

  it("no secured alternative is offered when collateral is encumbered", () => {
    const profile: BorrowerProfile = {
      incomeType: "self_employed_documented",
      documentedAnnualIncome: 420000,
      hasCollateral: true,
      collateralType: "property",
      collateralEstimatedValue: 4500000,
      collateralEncumbered: true, // <- encumbered
    };
    const result = calculateLikelySanction(profile);
    expect(result.securedAlternative).toBeUndefined();
  });

  it("with no income information at all, returns a zero range and low confidence rather than guessing", () => {
    const result = calculateLikelySanction({});
    expect(result.value).toEqual({ low: 0, high: 0 });
    expect(result.confidence).toBe("low");
  });

  it("existing EMI reduces the sanctionable range for an otherwise-identical profile", () => {
    const base: BorrowerProfile = {
      incomeType: "salaried",
      netMonthlyIncome: 100000,
      creditScore: { status: "known", score: 750 },
    };
    const noExistingEmi = calculateLikelySanction({ ...base, existingMonthlyEmiTotal: 0 });
    const withExistingEmi = calculateLikelySanction({ ...base, existingMonthlyEmiTotal: 30000 });
    expect(withExistingEmi.value.high).toBeLessThan(noExistingEmi.value.high);
  });
});
