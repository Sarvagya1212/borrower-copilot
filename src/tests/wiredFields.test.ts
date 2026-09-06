import { describe, it, expect } from "vitest";
import { calculateAffordability } from "../rules/affordability";
import { calculateCreditRiskTier } from "../rules/creditRiskTier";
import { getBorrowingVerdict } from "../rules/verdict";
import type { BorrowerProfile } from "../types/borrower";

describe("emergency savings buffer adjustment (calculateAffordability)", () => {
  // essentialMonthlyExpenses is set high enough that the subsistence floor,
  // not the FOIR ceiling, is the binding constraint — otherwise the buffer
  // adjustment has no visible effect on the final result.
  const base: BorrowerProfile = {
    netMonthlyIncome: 60000,
    existingMonthlyEmiTotal: 5000,
    essentialMonthlyExpenses: 45000,
    hadPaymentBounceRecently: false,
  };

  it("a comfortable savings cushion (>=3 months) allows a smaller buffer, raising the safe EMI", () => {
    const noInfo = calculateAffordability(base, "moderate");
    const comfortable = calculateAffordability({ ...base, emergencySavingsMonths: 6 }, "moderate");
    expect(comfortable.value).toBeGreaterThan(noInfo.value);
    expect(comfortable.rationale).toMatch(/emergency-savings cushion/);
  });

  it("thin savings (<1 month) forces a larger buffer, lowering the safe EMI", () => {
    const noInfo = calculateAffordability(base, "moderate");
    const thin = calculateAffordability({ ...base, emergencySavingsMonths: 0.5 }, "moderate");
    expect(thin.value).toBeLessThan(noInfo.value);
    expect(thin.rationale).toMatch(/little to no emergency savings/);
  });
});

describe("co-applicant income (calculateAffordability)", () => {
  it("adds co-applicant income to the household income base when hasCoApplicant is true", () => {
    const solo: BorrowerProfile = {
      netMonthlyIncome: 40000,
      existingMonthlyEmiTotal: 0,
      essentialMonthlyExpenses: 15000,
    };
    const withCoApplicant: BorrowerProfile = { ...solo, hasCoApplicant: true, coApplicantMonthlyIncome: 18000 };
    const soloResult = calculateAffordability(solo, "stable");
    const combinedResult = calculateAffordability(withCoApplicant, "stable");
    expect(combinedResult.value).toBeGreaterThan(soloResult.value);
    expect(combinedResult.rationale).toMatch(/co-applicant/);
  });

  it("does not add co-applicant income if hasCoApplicant is false, even if an income figure is present", () => {
    const profile: BorrowerProfile = {
      netMonthlyIncome: 40000,
      essentialMonthlyExpenses: 15000,
      hasCoApplicant: false,
      coApplicantMonthlyIncome: 18000,
    };
    const withoutFlag: BorrowerProfile = { netMonthlyIncome: 40000, essentialMonthlyExpenses: 15000 };
    expect(calculateAffordability(profile, "stable").value).toBe(
      calculateAffordability(withoutFlag, "stable").value,
    );
  });
});

describe("credit card utilization downgrade (calculateCreditRiskTier)", () => {
  it("pulls a good score back to mid tier when utilization is very high", () => {
    const normal = calculateCreditRiskTier({ creditScore: { status: "known", score: 780 } });
    const highUtil = calculateCreditRiskTier({
      creditScore: { status: "known", score: 780 },
      creditCardUtilizationPercent: 90,
    });
    expect(normal.value.rateBandTier).toBe("good");
    expect(highUtil.value.rateBandTier).toBe("mid");
  });

  it("does not affect a score already below the good tier", () => {
    const result = calculateCreditRiskTier({
      creditScore: { status: "known", score: 600 },
      creditCardUtilizationPercent: 95,
    });
    expect(result.value.rateBandTier).toBe("weak");
  });
});

describe("explicit productive-purpose confirmation (getBorrowingVerdict)", () => {
  const withinRangeProfile: BorrowerProfile = {
    amountWanted: 100000,
    loanPurpose: "vehicle_for_income",
  };
  const safeAmountResult = { value: { low: 80000, high: 150000 }, rationale: "", confidence: "high" as const, sourceOrJudgement: "" };

  it("defaults to purpose-based productive framing when the question wasn't asked", () => {
    const result = getBorrowingVerdict({
      profile: withinRangeProfile,
      safeAmount: safeAmountResult,
      safeEmiCeiling: 20000,
    });
    expect(result.rationale).toMatch(/income-generating|investment-style/);
  });

  it("an explicit denial overrides the purpose-based default", () => {
    const result = getBorrowingVerdict({
      profile: { ...withinRangeProfile, loanExpectedToGenerateIncome: false },
      safeAmount: safeAmountResult,
      safeEmiCeiling: 20000,
    });
    expect(result.rationale).not.toMatch(/investment-style/);
  });

  it("an explicit confirmation applies productive framing even for a purpose not on the default list", () => {
    const result = getBorrowingVerdict({
      profile: { amountWanted: 100000, loanPurpose: "other", loanExpectedToGenerateIncome: true },
      safeAmount: safeAmountResult,
      safeEmiCeiling: 20000,
    });
    expect(result.rationale).toMatch(/investment-style/);
  });

  it("mentions the expected monthly income figure when provided alongside confirmation", () => {
    const result = getBorrowingVerdict({
      profile: { ...withinRangeProfile, loanExpectedToGenerateIncome: true, expectedMonthlyIncomeFromLoan: 8000 },
      safeAmount: safeAmountResult,
      safeEmiCeiling: 20000,
    });
    expect(result.rationale).toMatch(/8,000/);
    expect(result.rationale).toMatch(/doesn't raise the safe amount/);
  });
});
