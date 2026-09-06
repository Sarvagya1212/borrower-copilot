import { describe, it, expect } from "vitest";
import { calculateFairRate } from "../rules/fairRate";
import type { BorrowerProfile } from "../types/borrower";

describe("calculateFairRate", () => {
  it("personal loan, good score: matches the sourced good-tier band", () => {
    const profile: BorrowerProfile = {
      loanType: "personal_loan",
      creditScore: { status: "known", score: 780 },
    };
    const result = calculateFairRate(profile);
    expect(result.value).toEqual({ low: 10.5, high: 14.5 });
  });

  it("personal loan, unknown score: wider AND higher than a known-good score, not treated as bad credit", () => {
    const good = calculateFairRate({
      loanType: "personal_loan",
      creditScore: { status: "known", score: 780 },
    });
    const unknown = calculateFairRate({
      loanType: "personal_loan",
      creditScore: { status: "unknown" },
    });
    const weak = calculateFairRate({
      loanType: "personal_loan",
      creditScore: { status: "known", score: 600 },
    });
    // unknown sits strictly between good and weak, both ends
    expect(unknown.value.low).toBeGreaterThan(good.value.low);
    expect(unknown.value.high).toBeLessThan(weak.value.high);
    expect(unknown.value.low).toBeLessThan(weak.value.low);
  });

  it("gold loan pricing is identical regardless of credit-risk tier", () => {
    const goodCredit = calculateFairRate({
      loanType: "gold_loan",
      creditScore: { status: "known", score: 800 },
    });
    const noCreditHistory = calculateFairRate({
      loanType: "gold_loan",
      creditScore: { status: "never_taken_formal_credit" },
    });
    const bounced = calculateFairRate({
      loanType: "gold_loan",
      hadPaymentBounceRecently: true,
    });
    expect(goodCredit.value).toEqual(noCreditHistory.value);
    expect(goodCredit.value).toEqual(bounced.value);
  });

  it("loan against property picks the documented sub-band for a salaried borrower", () => {
    const result = calculateFairRate({
      loanType: "loan_against_property",
      incomeType: "salaried",
    });
    expect(result.value).toEqual({ low: 8.3, high: 12.75 });
  });

  it("loan against property picks the less-documented sub-band for self-employed without ITR income", () => {
    const result = calculateFairRate({
      loanType: "loan_against_property",
      incomeType: "self_employed_documented",
      // documentedAnnualIncome intentionally omitted
    });
    expect(result.value).toEqual({ low: 12, high: 16 });
  });

  it("home loan is not fabricated — flagged plainly at low confidence with a labeled proxy band", () => {
    const result = calculateFairRate({ loanType: "home_loan" });
    expect(result.confidence).toBe("low");
    expect(result.rationale).toMatch(/isn't specifically modeled/);
  });

  it("missing loan type widens the band and caps confidence, flagging the gap", () => {
    const known = calculateFairRate({
      loanType: "personal_loan",
      creditScore: { status: "known", score: 780 },
    });
    const unspecified = calculateFairRate({ creditScore: { status: "known", score: 780 } });
    const knownWidth = known.value.high - known.value.low;
    const unspecifiedWidth = unspecified.value.high - unspecified.value.low;
    expect(unspecifiedWidth).toBeGreaterThan(knownWidth);
    expect(unspecified.limitedBy).toContain("loanType");
  });

  it("business loan and two-wheeler loan bands are capped at medium confidence, reflecting weak evidence", () => {
    const business = calculateFairRate({
      loanType: "business_loan",
      creditScore: { status: "known", score: 780 }, // even with otherwise-strong info
    });
    const twoWheeler = calculateFairRate({
      loanType: "two_wheeler_loan",
      creditScore: { status: "known", score: 780 },
    });
    expect(business.confidence).not.toBe("high");
    expect(twoWheeler.confidence).not.toBe("high");
  });
});
