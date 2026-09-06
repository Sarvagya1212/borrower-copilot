import { describe, it, expect } from "vitest";
import { getBorrowingVerdict } from "../rules/verdict";
import type { BorrowerProfile, CalculationResult, Range } from "../types/borrower";

const safeAmount: CalculationResult<Range> = {
  value: { low: 300000, high: 400000 },
  rationale: "test",
  confidence: "medium",
  sourceOrJudgement: "test",
};

describe("getBorrowingVerdict", () => {
  it("zero safe EMI ceiling => don't borrow, unconditionally", () => {
    const result = getBorrowingVerdict({ profile: {}, safeAmount, safeEmiCeiling: 0 });
    expect(result.verdict).toBe("dont_borrow");
  });

  it("bounce + high-cost existing debt => don't borrow, even for a productive purpose (Decision D3 / Anita case)", () => {
    const profile: BorrowerProfile = {
      hadPaymentBounceRecently: true,
      existingLoanRatesKnown: [32],
      loanPurpose: "vehicle_for_income", // stated productive purpose
      amountWanted: 150000,
    };
    const result = getBorrowingVerdict({ profile, safeAmount, safeEmiCeiling: 5000 });
    expect(result.verdict).toBe("dont_borrow");
    expect(result.decidingFactor).toMatch(/bounce/i);
  });

  it("bounce WITHOUT known high-cost debt => borrow_less, not a full stop", () => {
    const profile: BorrowerProfile = { hadPaymentBounceRecently: true };
    const result = getBorrowingVerdict({ profile, safeAmount, safeEmiCeiling: 20000 });
    expect(result.verdict).toBe("borrow_less");
  });

  it("requested amount well above the safe range => borrow_less", () => {
    const profile: BorrowerProfile = { amountWanted: 800000 }; // safe high is 400,000
    const result = getBorrowingVerdict({ profile, safeAmount, safeEmiCeiling: 20000 });
    expect(result.verdict).toBe("borrow_less");
    expect(result.rationale).toMatch(/8,00,000/);
  });

  it("requested amount comfortably within the safe range => borrow", () => {
    const profile: BorrowerProfile = { amountWanted: 350000 };
    const result = getBorrowingVerdict({ profile, safeAmount, safeEmiCeiling: 20000 });
    expect(result.verdict).toBe("borrow");
  });

  it("productive purpose changes the FRAMING but not the recommended amount (Decision D3 capped influence)", () => {
    const discretionary: BorrowerProfile = { amountWanted: 350000, loanPurpose: "wedding" };
    const productive: BorrowerProfile = { amountWanted: 350000, loanPurpose: "business_stock_or_equipment" };
    const discretionaryResult = getBorrowingVerdict({ profile: discretionary, safeAmount, safeEmiCeiling: 20000 });
    const productiveResult = getBorrowingVerdict({ profile: productive, safeAmount, safeEmiCeiling: 20000 });
    expect(discretionaryResult.verdict).toBe("borrow");
    expect(productiveResult.verdict).toBe("borrow");
    // language differs...
    expect(productiveResult.rationale).toMatch(/income-generating|investment-style/);
    expect(discretionaryResult.rationale).not.toMatch(/income-generating|investment-style/);
    // ...but the recommended range is identical, since safeAmount wasn't inflated by the purpose
    expect(productiveResult.rationale).toMatch(/3,00,000/);
    expect(discretionaryResult.rationale).toMatch(/3,00,000/);
  });

  it("no amount stated at all still produces a 'borrow' verdict scoped to the safe range", () => {
    const result = getBorrowingVerdict({ profile: {}, safeAmount, safeEmiCeiling: 20000 });
    expect(result.verdict).toBe("borrow");
  });
});
