import { describe, it, expect } from "vitest";
import { calculateStressScenario } from "../rules/stressScenario";
import type { BorrowerProfile } from "../types/borrower";

describe("calculateStressScenario", () => {
  const comfortableProfile: BorrowerProfile = {
    netMonthlyIncome: 110000,
    existingMonthlyEmiTotal: 14000,
    essentialMonthlyExpenses: 28000,
    hadPaymentBounceRecently: false,
  };

  it("flags an income-drop breach when the proposed EMI is close to the current ceiling", () => {
    // Safe ceiling here is 41,000 (FOIR path, see affordability tests). A
    // proposed EMI close to that will breach once income drops 20%.
    const result = calculateStressScenario(comfortableProfile, "stable", 38000, 800000, 12, 60);
    expect(result.value.incomeDropBreach).toBe(true);
  });

  it("does not flag an income-drop breach when there's comfortable headroom", () => {
    const result = calculateStressScenario(comfortableProfile, "stable", 15000, 400000, 12, 60);
    expect(result.value.incomeDropBreach).toBe(false);
  });

  it("flags a rate-rise breach when the proposed EMI is close to the ceiling", () => {
    // Safe ceiling here is 41,000. At 11%/60mo, EMI(1,850,000) ≈ 40,222 (just
    // under). At 13% (stressed), EMI(1,850,000) ≈ 42,093 (over) — an
    // edge case that only breaches because of the rate rise, not already.
    const result = calculateStressScenario(comfortableProfile, "stable", 40222, 1850000, 11, 60);
    expect(result.value.rateRiseBreach).toBe(true);
  });

  it("does not flag a rate-rise breach when there's comfortable headroom", () => {
    const result = calculateStressScenario(comfortableProfile, "stable", 15000, 400000, 12, 60);
    expect(result.value.rateRiseBreach).toBe(false);
  });

  it("rationale mentions both scenarios regardless of outcome", () => {
    const result = calculateStressScenario(comfortableProfile, "stable", 15000, 400000, 12, 60);
    expect(result.rationale).toMatch(/income drop/i);
    expect(result.rationale).toMatch(/rate/i);
  });

  it("does not crash when there's no principal to stress-test (safe amount is already ₹0) — regression for a real bug caught during persona validation", () => {
    const emptyProfile: BorrowerProfile = { incomeType: "self_employed_documented" };
    expect(() => calculateStressScenario(emptyProfile, "volatile", 0, 0, 15, 60)).not.toThrow();
    const result = calculateStressScenario(emptyProfile, "volatile", 0, 0, 15, 60);
    expect(result.value.emiUnderRateRise).toBe(0);
    expect(result.value.rateRiseBreach).toBe(false);
  });
});
