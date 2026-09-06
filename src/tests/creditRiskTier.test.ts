import { describe, it, expect } from "vitest";
import { calculateCreditRiskTier } from "../rules/creditRiskTier";
import type { BorrowerProfile } from "../types/borrower";

describe("calculateCreditRiskTier", () => {
  it("known score >= 750 => good", () => {
    const profile: BorrowerProfile = { creditScore: { status: "known", score: 780 } };
    const result = calculateCreditRiskTier(profile);
    expect(result.value.lenderFoirTier).toBe("good");
    expect(result.value.rateBandTier).toBe("good");
  });

  it("known score < 650 => weak", () => {
    const profile: BorrowerProfile = { creditScore: { status: "known", score: 600 } };
    const result = calculateCreditRiskTier(profile);
    expect(result.value.lenderFoirTier).toBe("weak");
    expect(result.value.rateBandTier).toBe("weak");
  });

  it("known score 650-749 => mid", () => {
    const profile: BorrowerProfile = { creditScore: { status: "known", score: 700 } };
    const result = calculateCreditRiskTier(profile);
    expect(result.value.lenderFoirTier).toBe("midOrUnknown");
    expect(result.value.rateBandTier).toBe("mid");
  });

  it("unknown score groups with mid for FOIR purposes but gets its own rate-band tier", () => {
    const profile: BorrowerProfile = { creditScore: { status: "unknown" } };
    const result = calculateCreditRiskTier(profile);
    expect(result.value.lenderFoirTier).toBe("midOrUnknown");
    expect(result.value.rateBandTier).toBe("unknown");
  });

  it("never taken formal credit is distinct from unknown, even though similarly cautious", () => {
    const profile: BorrowerProfile = { creditScore: { status: "never_taken_formal_credit" } };
    const result = calculateCreditRiskTier(profile);
    expect(result.value.rateBandTier).toBe("neverTaken");
    expect(result.value.rateBandTier).not.toBe("unknown");
  });

  it("a recent bounce overrides an otherwise-excellent score", () => {
    const profile: BorrowerProfile = {
      creditScore: { status: "known", score: 800 },
      hadPaymentBounceRecently: true,
    };
    const result = calculateCreditRiskTier(profile);
    expect(result.value.lenderFoirTier).toBe("weak");
    expect(result.value.rateBandTier).toBe("weak");
  });

  it("missing credit score entirely is treated the same as explicitly unknown, and flags it", () => {
    const result = calculateCreditRiskTier({});
    expect(result.value.rateBandTier).toBe("unknown");
    expect(result.limitedBy).toContain("creditScore");
  });
});
