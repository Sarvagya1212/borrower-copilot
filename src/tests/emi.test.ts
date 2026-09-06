import { describe, it, expect } from "vitest";
import { calculateEMI, calculateTotalInterest, principalFromEMI } from "../calculations/emi";

describe("calculateEMI", () => {
  it("matches a known reference value: 8,00,000 at 12% for 36 months", () => {
    // Reference EMI for this exact combination, computed independently via
    // the standard formula, is approximately ₹26,573.
    const emi = calculateEMI(800000, 12, 36);
    expect(emi).toBeGreaterThan(26500);
    expect(emi).toBeLessThan(26650);
  });

  it("handles the zero-rate edge case as a flat split", () => {
    const emi = calculateEMI(120000, 0, 12);
    expect(emi).toBeCloseTo(10000, 6);
  });

  it("throws on non-positive principal or tenure", () => {
    expect(() => calculateEMI(0, 10, 12)).toThrow();
    expect(() => calculateEMI(100000, 10, 0)).toThrow();
    expect(() => calculateEMI(-5000, 10, 12)).toThrow();
  });

  it("produces a higher EMI for a shorter tenure, same principal and rate", () => {
    const emiShort = calculateEMI(500000, 11, 24);
    const emiLong = calculateEMI(500000, 11, 60);
    expect(emiShort).toBeGreaterThan(emiLong);
  });

  it("total interest is EMI*n minus principal", () => {
    const principal = 300000;
    const emi = calculateEMI(principal, 10, 24);
    const totalInterest = calculateTotalInterest(principal, emi, 24);
    expect(totalInterest).toBeCloseTo(emi * 24 - principal, 6);
    expect(totalInterest).toBeGreaterThan(0);
  });

  it("principalFromEMI correctly inverts calculateEMI", () => {
    const principal = 800000;
    const rate = 12.5;
    const tenure = 60;
    const emi = calculateEMI(principal, rate, tenure);
    const recoveredPrincipal = principalFromEMI(emi, rate, tenure);
    expect(recoveredPrincipal).toBeCloseTo(principal, 2);
  });

  it("principalFromEMI handles the zero-rate case", () => {
    expect(principalFromEMI(1000, 0, 12)).toBeCloseTo(12000, 6);
  });

  it("principalFromEMI returns 0 for non-positive EMI or tenure", () => {
    expect(principalFromEMI(0, 10, 12)).toBe(0);
    expect(principalFromEMI(1000, 10, 0)).toBe(0);
  });

  it("a higher rate yields a lower principal for the same EMI and tenure", () => {
    const lowRatePrincipal = principalFromEMI(20000, 10, 60);
    const highRatePrincipal = principalFromEMI(20000, 20, 60);
    expect(highRatePrincipal).toBeLessThan(lowRatePrincipal);
  });
});
