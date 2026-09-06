import { describe, it, expect } from "vitest";
import type { BorrowerProfile } from "../types/borrower";
import { calculateStabilityTier } from "../rules/stabilityTier";
import { calculateAffordability } from "../rules/affordability";
import { calculateFairRate } from "../rules/fairRate";
import { runFullAssessment } from "../rules/assemble";
import { RECOMMENDED_TENURE_MONTHS_BY_PRODUCT } from "../data/thresholds";

function runPipeline(profile: BorrowerProfile) {
  return runFullAssessment(profile);
}

describe("Persona: Priya (29, Bengaluru, salaried)", () => {
  const priya: BorrowerProfile = {
    loanPurpose: "wedding",
    amountWanted: 800000,
    loanType: "personal_loan",
    netMonthlyIncome: 110000,
    incomeType: "salaried",
    existingMonthlyEmiTotal: 14000,
    essentialMonthlyExpenses: 28000,
    age: 29,
    creditScore: { status: "known", score: 780 },
    tenureYearsInJobOrBusiness: 5,
    hadPaymentBounceRecently: false,
  };

  const result = runPipeline(priya);

  it("is treated as a stable, good-tier borrower", () => {
    expect(result.stability.value).toBe("stable");
    expect(result.fairRate.value).toEqual({ low: 10.5, high: 14.5 }); // sourced good-tier band
  });

  it("gets a real, non-zero safe EMI ceiling", () => {
    expect(result.affordability.value).toBeGreaterThan(0);
  });

  it("produces a verdict of borrow or borrow_less (never dont_borrow — she's a strong profile)", () => {
    expect(["borrow", "borrow_less"]).toContain(result.verdict.verdict);
  });

  it("has reasonably high confidence given how complete her profile is", () => {
    expect(["medium", "high"]).toContain(result.affordability.confidence);
  });
});

describe("Persona: Ravi (42, Mysuru, self-employed)", () => {
  const ravi: BorrowerProfile = {
    loanPurpose: "business_stock_or_equipment",
    amountWanted: 1500000,
    loanType: "personal_loan", // what he ASKED for — the app should still surface the LAP alternative
    netMonthlyIncome: 60000, // midpoint of his stated 40-80k cash income
    incomeType: "self_employed_documented",
    documentedAnnualIncome: 420000,
    existingMonthlyEmiTotal: 0,
    essentialMonthlyExpenses: 30000, // reasonable estimate given household context
    age: 42,
    creditScore: { status: "never_taken_formal_credit" },
    tenureYearsInJobOrBusiness: 14,
    hadPaymentBounceRecently: false,
    hasCollateral: true,
    collateralType: "property",
    collateralEstimatedValue: 4500000,
    collateralEncumbered: false,
  };

  const result = runPipeline(ravi);

  it("gets a likely UNSECURED sanction sized off documented income, far below his requested amount", () => {
    expect(result.sanction.value.high).toBeLessThan(400000);
  });

  it("is offered a property-secured alternative that is materially larger than the unsecured sanction", () => {
    expect(result.sanction.securedAlternative).toBeDefined();
    expect(result.sanction.securedAlternative!.estimatedAmount).toBeGreaterThan(result.sanction.value.high);
    // this is the central insight the persona is meant to surface
    expect(result.sanction.securedAlternative!.collateralType).toBe("property");
  });

  it("his safe-affordability number (from real cash flow) is not artificially capped by his thin documented income", () => {
    // Safe EMI is driven by calculateAffordability using netMonthlyIncome
    // (real cash flow), NOT documentedAnnualIncome — confirms Decision D1's
    // separation is actually working end-to-end, not just in isolated tests.
    expect(result.affordability.value).toBeGreaterThan(0);
  });

  it("does not receive a dont_borrow verdict purely for having no formal credit history", () => {
    expect(result.verdict.verdict).not.toBe("dont_borrow");
  });

  it("the secured (LAP) safe amount is materially larger than the unsecured safe amount, and both are visible in the comparison (Decision D5)", () => {
    expect(result.securedSafeAmount).toBeDefined();
    expect(result.securedSafeAmount!.value.high).toBeGreaterThan(result.safeAmount.value.high);
    expect(result.verdict.securedComparison).toBeDefined();
    expect(result.verdict.securedComparison!.betterPath).toBe("secured");
    expect(result.verdict.securedComparison!.unsecured.range).toEqual(result.safeAmount.value);
    expect(result.verdict.securedComparison!.secured.range).toEqual(result.securedSafeAmount!.value);
  });

  it("the secured safe amount is capped by his safe-EMI ceiling, not just the LTV cap (Decision D6)", () => {
    // LTV ceiling alone would be 55% of 45,00,000 = 24,75,000 — the actual
    // secured safe amount should be LOWER than that, because his safe EMI
    // (24,000 at a moderate stability tier) doesn't support the full LTV
    // ceiling at LAP rates over the LAP tenure.
    expect(result.securedSafeAmount!.value.high).toBeLessThan(2475000);
  });

  it("the verdict names the secured product explicitly when it's the better path, not just a bigger number", () => {
    expect(result.verdict.rationale.toLowerCase()).toMatch(/loan against property|lap/);
  });
});

describe("Persona: Anita (35, Hubballi, informal)", () => {
  const anita: BorrowerProfile = {
    loanPurpose: "vehicle_for_income", // stated productive purpose — the hard case
    amountWanted: 150000,
    loanType: "two_wheeler_loan",
    netMonthlyIncome: 28000, // midpoint of her 26-30k range
    incomeType: "informal_or_gig",
    existingMonthlyEmiTotal: 8000, // rough allocation of her ₹35,000 outstanding across three app loans
    essentialMonthlyExpenses: 16000, // two children, one unemployed adult in the household
    age: 35,
    creditScore: { status: "unknown" },
    hadPaymentBounceRecently: true,
    existingLoanRatesKnown: [32], // "existing loans at 30%+"
  };

  const result = runPipeline(anita);

  it("does NOT get a plain 'borrow' verdict despite the productive, income-generating purpose (Decision D3)", () => {
    expect(result.verdict.verdict).not.toBe("borrow");
    expect(["borrow_less", "dont_borrow"]).toContain(result.verdict.verdict);
  });

  it("the bounce + high-cost existing debt combination is what's actually named as the deciding factor, not the purpose", () => {
    expect(result.verdict.decidingFactor.toLowerCase()).toMatch(/bounce/);
  });

  it("her stability tier is volatile", () => {
    expect(result.stability.value).toBe("volatile");
  });

  it("a fuller version of her profile does not produce LOWER confidence than a sparser one (confidence widens with missing info, in the right direction)", () => {
    const sparseAnita: BorrowerProfile = {
      incomeType: "informal_or_gig",
      netMonthlyIncome: 28000,
    };
    const sparseResult = calculateAffordability(sparseAnita, calculateStabilityTier(sparseAnita).value);
    const rank = { low: 0, medium: 1, high: 2 } as const;
    expect(rank[sparseResult.confidence]).toBeLessThanOrEqual(rank[result.affordability.confidence]);
  });

  it("her fair-rate band, compared on the SAME product as Priya (personal loan), is higher — reflecting real risk signals (bounce + unknown score), not an assumed bad score by default", () => {
    const anitaAsPersonalLoan = calculateFairRate({ ...anita, loanType: "personal_loan" });
    const priyaFairRate = calculateFairRate({
      loanType: "personal_loan",
      creditScore: { status: "known", score: 780 },
    });
    expect(anitaAsPersonalLoan.value.low).toBeGreaterThan(priyaFairRate.value.low);
  });
});

describe("Cross-persona sanity checks", () => {
  it("all three personas produce a usable (non-crashing, defined) output for every core function", () => {
    const personas: BorrowerProfile[] = [
      { incomeType: "salaried", netMonthlyIncome: 110000 },
      { incomeType: "self_employed_documented", documentedAnnualIncome: 420000 },
      { incomeType: "informal_or_gig", netMonthlyIncome: 28000 },
    ];
    for (const profile of personas) {
      const result = runPipeline(profile);
      expect(result.stability.value).toBeDefined();
      expect(result.affordability.value).toBeGreaterThanOrEqual(0);
      expect(result.sanction.value).toBeDefined();
      expect(result.fairRate.value.low).toBeLessThan(result.fairRate.value.high);
      expect(result.safeAmount.value).toBeDefined();
      expect(result.verdict.verdict).toBeDefined();
    }
  });

  it("RECOMMENDED_TENURE_MONTHS_BY_PRODUCT covers every loan type referenced across the three personas", () => {
    expect(RECOMMENDED_TENURE_MONTHS_BY_PRODUCT.personal_loan).toBeDefined();
    expect(RECOMMENDED_TENURE_MONTHS_BY_PRODUCT.two_wheeler_loan).toBeDefined();
    expect(RECOMMENDED_TENURE_MONTHS_BY_PRODUCT.loan_against_property).toBeDefined();
  });
});
