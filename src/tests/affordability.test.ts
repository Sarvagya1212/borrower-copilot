import { describe, it, expect } from "vitest";
import { calculateAffordability } from "../rules/affordability";
import type { BorrowerProfile } from "../types/borrower";

describe("calculateAffordability", () => {
  it("FOIR ceiling binds when expenses are comfortably low relative to income (Priya-like)", () => {
    const profile: BorrowerProfile = {
      netMonthlyIncome: 110000,
      existingMonthlyEmiTotal: 14000,
      essentialMonthlyExpenses: 28000,
      hadPaymentBounceRecently: false,
    };
    // FOIR (stable, 50%): 55000 - 14000 = 41000
    // Floor: 110000 - 28000 - 14000 - 11000(buffer) = 57000
    // min => FOIR binds at 41000
    const result = calculateAffordability(profile, "stable");
    expect(result.value).toBe(41000);
    expect(result.rationale).toMatch(/capped at 50% of your net income/);
  });

  it("subsistence floor binds when income is low relative to essential expenses (Anita-like)", () => {
    const profile: BorrowerProfile = {
      netMonthlyIncome: 28000,
      existingMonthlyEmiTotal: 0,
      essentialMonthlyExpenses: 25000,
      hadPaymentBounceRecently: false,
    };
    // FOIR (volatile, 30%): 8400
    // Floor: 28000 - 25000 - 0 - 2800(buffer) = 200
    // min => floor binds at 200
    const result = calculateAffordability(profile, "volatile");
    expect(result.value).toBe(200);
    expect(result.rationale).toMatch(/essential expenses/);
  });

  it("a recent payment bounce reduces the result by the documented fraction", () => {
    const base: BorrowerProfile = {
      netMonthlyIncome: 110000,
      existingMonthlyEmiTotal: 14000,
      essentialMonthlyExpenses: 28000,
    };
    const withoutBounce = calculateAffordability(
      { ...base, hadPaymentBounceRecently: false },
      "stable",
    );
    const withBounce = calculateAffordability(
      { ...base, hadPaymentBounceRecently: true },
      "stable",
    );
    expect(withBounce.value).toBeLessThan(withoutBounce.value);
    expect(withBounce.value).toBeCloseTo(withoutBounce.value * 0.8, -1);
  });

  it("floors at zero rather than going negative when obligations already exceed income", () => {
    const profile: BorrowerProfile = {
      netMonthlyIncome: 20000,
      existingMonthlyEmiTotal: 18000,
      essentialMonthlyExpenses: 15000,
      hadPaymentBounceRecently: true,
    };
    const result = calculateAffordability(profile, "volatile");
    expect(result.value).toBe(0);
    expect(result.rationale).toMatch(/don't see room/);
  });

  it("missing essential expenses falls back to FOIR-only and flags the gap with reduced confidence", () => {
    const profile: BorrowerProfile = {
      netMonthlyIncome: 60000,
      existingMonthlyEmiTotal: 5000,
      hadPaymentBounceRecently: false,
    };
    const result = calculateAffordability(profile, "moderate");
    expect(result.limitedBy).toContain("essentialMonthlyExpenses");
    expect(result.confidence).not.toBe("high");
  });

  it("not knowing bounce history at all further reduces confidence and is flagged", () => {
    const profile: BorrowerProfile = {
      netMonthlyIncome: 60000,
      existingMonthlyEmiTotal: 5000,
      essentialMonthlyExpenses: 20000,
    };
    const result = calculateAffordability(profile, "moderate");
    expect(result.limitedBy).toContain("hadPaymentBounceRecently");
    expect(result.confidence).toBe("medium");
  });

  it("the same missing fields never produce a HIGHER confidence than a fully-answered equivalent profile", () => {
    const complete: BorrowerProfile = {
      netMonthlyIncome: 60000,
      existingMonthlyEmiTotal: 5000,
      essentialMonthlyExpenses: 20000,
      hadPaymentBounceRecently: false,
    };
    const incomplete: BorrowerProfile = {
      netMonthlyIncome: 60000,
    };
    const completeResult = calculateAffordability(complete, "moderate");
    const incompleteResult = calculateAffordability(incomplete, "moderate");
    const rank = { low: 0, medium: 1, high: 2 };
    expect(rank[incompleteResult.confidence]).toBeLessThanOrEqual(rank[completeResult.confidence]);
  });
});
