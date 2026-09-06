import { describe, it, expect } from "vitest";
import { emiAcrossTenures } from "../calculations/emi";
import { calculateSafeBorrowingAmount } from "../rules/safeBorrowingAmount";
import type { BorrowerProfile, CalculationResult, Range } from "../types/borrower";

describe("emiAcrossTenures", () => {
  it("produces one EMI per requested tenure, decreasing as tenure lengthens", () => {
    const options = emiAcrossTenures(500000, 12, [12, 24, 36, 48, 60]);
    expect(options).toHaveLength(5);
    for (let i = 1; i < options.length; i++) {
      expect(options[i].emi).toBeLessThan(options[i - 1].emi);
    }
  });
});

describe("calculateSafeBorrowingAmount", () => {
  const highConfidenceAffordability: CalculationResult<number> = {
    value: 40000,
    rationale: "test",
    confidence: "high",
    sourceOrJudgement: "test",
  };
  const highConfidenceFairRate: CalculationResult<Range> = {
    value: { low: 11, high: 13 },
    rationale: "test",
    confidence: "high",
    sourceOrJudgement: "test",
  };

  it("a lower rate within the band supports a larger principal at the same EMI", () => {
    const profile: BorrowerProfile = { loanType: "personal_loan" };
    const result = calculateSafeBorrowingAmount(profile, highConfidenceAffordability, highConfidenceFairRate);
    // low end of the amount range corresponds to the HIGH end of the rate band
    expect(result.value.low).toBeGreaterThan(0);
    expect(result.value.high).toBeGreaterThan(result.value.low);
  });

  it("returns a zero range with a clear message when the safe EMI ceiling is zero", () => {
    const zeroAffordability: CalculationResult<number> = { ...highConfidenceAffordability, value: 0 };
    const result = calculateSafeBorrowingAmount({}, zeroAffordability, highConfidenceFairRate);
    expect(result.value).toEqual({ low: 0, high: 0 });
    expect(result.rationale).toMatch(/₹0/);
  });

  it("inherits the LOWER confidence of its two inputs, never overwrites it with 'high'", () => {
    const lowConfidenceAffordability: CalculationResult<number> = {
      ...highConfidenceAffordability,
      confidence: "low",
      limitedBy: ["essentialMonthlyExpenses"],
    };
    const result = calculateSafeBorrowingAmount({}, lowConfidenceAffordability, highConfidenceFairRate);
    expect(result.confidence).toBe("low");
    expect(result.limitedBy).toContain("essentialMonthlyExpenses");
  });

  it("a wider fair-rate band (lower confidence input) produces a wider amount range", () => {
    const narrowBand: CalculationResult<Range> = { ...highConfidenceFairRate, value: { low: 11, high: 12 } };
    const wideBand: CalculationResult<Range> = { ...highConfidenceFairRate, value: { low: 9, high: 15 } };
    const narrowResult = calculateSafeBorrowingAmount({}, highConfidenceAffordability, narrowBand);
    const wideResult = calculateSafeBorrowingAmount({}, highConfidenceAffordability, wideBand);
    const narrowWidth = narrowResult.value.high - narrowResult.value.low;
    const wideWidth = wideResult.value.high - wideResult.value.low;
    expect(wideWidth).toBeGreaterThan(narrowWidth);
  });
});
