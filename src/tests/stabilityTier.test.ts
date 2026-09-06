import { describe, it, expect } from "vitest";
import { calculateStabilityTier } from "../rules/stabilityTier";
import type { BorrowerProfile } from "../types/borrower";

describe("calculateStabilityTier", () => {
  it("salaried, tenure >= 1 year => stable", () => {
    const profile: BorrowerProfile = { incomeType: "salaried", tenureYearsInJobOrBusiness: 5 };
    expect(calculateStabilityTier(profile).value).toBe("stable");
  });

  it("salaried, tenure < 1 year => moderate", () => {
    const profile: BorrowerProfile = { incomeType: "salaried", tenureYearsInJobOrBusiness: 0.5 };
    expect(calculateStabilityTier(profile).value).toBe("moderate");
  });

  it("self-employed documented, business age >= 2 years => moderate", () => {
    const profile: BorrowerProfile = {
      incomeType: "self_employed_documented",
      tenureYearsInJobOrBusiness: 14,
    };
    expect(calculateStabilityTier(profile).value).toBe("moderate");
  });

  it("self-employed documented, business age < 2 years => volatile", () => {
    const profile: BorrowerProfile = {
      incomeType: "self_employed_documented",
      tenureYearsInJobOrBusiness: 1,
    };
    expect(calculateStabilityTier(profile).value).toBe("volatile");
  });

  it("informal/gig income => always volatile, even with long tenure", () => {
    const profile: BorrowerProfile = {
      incomeType: "informal_or_gig",
      tenureYearsInJobOrBusiness: 10,
    };
    expect(calculateStabilityTier(profile).value).toBe("volatile");
  });

  it("self-reported volatility overrides an otherwise-stable salaried profile", () => {
    const profile: BorrowerProfile = {
      incomeType: "salaried",
      tenureYearsInJobOrBusiness: 5,
      incomeIsSeasonalOrVolatile: true,
    };
    expect(calculateStabilityTier(profile).value).toBe("volatile");
  });

  it("missing income type defaults to volatile, low confidence, and flags what's missing", () => {
    const result = calculateStabilityTier({});
    expect(result.value).toBe("volatile");
    expect(result.confidence).toBe("low");
    expect(result.limitedBy).toContain("incomeType");
  });

  it("missing tenure for a salaried borrower defaults to moderate (not stable), and flags it", () => {
    const result = calculateStabilityTier({ incomeType: "salaried" });
    expect(result.value).toBe("moderate");
    expect(result.limitedBy).toContain("tenureYearsInJobOrBusiness");
  });

  it("missing tenure for a self-employed borrower defaults to volatile (the more conservative case)", () => {
    const result = calculateStabilityTier({ incomeType: "self_employed_documented" });
    expect(result.value).toBe("volatile");
    expect(result.limitedBy).toContain("tenureYearsInJobOrBusiness");
  });
});
