import { describe, it, expect } from "vitest";
import { solveIRR, calculateAPR } from "../calculations/irr";
import { calculateEMI } from "../calculations/emi";

describe("solveIRR", () => {
  it("solves a trivial single-period case exactly: -1000 now, +1100 in one period => 10%", () => {
    const rate = solveIRR([-1000, 1100]);
    expect(rate).toBeCloseTo(0.1, 6);
  });

  it("solves a simple two-period case: -1000 now, +550 twice at 10%/period", () => {
    // 550/1.1 + 550/1.1^2 = 500 + 454.5... ≈ 954.5, not 1000, so the true
    // rate is a bit lower than 10% — just check it lands in a sane range
    // and that NPV at the solved rate is ~0.
    const cashflows = [-1000, 550, 550];
    const rate = solveIRR(cashflows);
    const npvAtRate = cashflows.reduce(
      (sum, cf, i) => sum + cf / Math.pow(1 + rate, i),
      0,
    );
    expect(Math.abs(npvAtRate)).toBeLessThan(1e-6);
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.1);
  });

  it("throws when the cash-flow stream has no sign change", () => {
    expect(() => solveIRR([100, 100, 100])).toThrow();
  });
});

describe("calculateAPR", () => {
  it("with zero processing fee, effective annual rate ≈ the nominal rate compounded monthly", () => {
    const principal = 500000;
    const nominalRate = 12; // %
    const tenureMonths = 36;
    const emi = calculateEMI(principal, nominalRate, tenureMonths);

    const { aprPercent } = calculateAPR(principal, nominalRate, 0, tenureMonths, emi);

    // No fee means disbursal == principal, so the IRR should recover
    // essentially the same monthly rate the EMI was built from, i.e.
    // (1 + 0.12/12)^12 - 1 ≈ 12.68%
    expect(aprPercent).toBeGreaterThan(12.5);
    expect(aprPercent).toBeLessThan(12.9);
  });

  it("a nonzero processing fee always pushes APR above the nominal rate", () => {
    const principal = 500000;
    const nominalRate = 12; // %
    const tenureMonths = 36;
    const emi = calculateEMI(principal, nominalRate, tenureMonths);

    const { aprPercent: aprNoFee } = calculateAPR(principal, nominalRate, 0, tenureMonths, emi);
    const { aprPercent: aprWithFee } = calculateAPR(principal, nominalRate, 2, tenureMonths, emi);

    expect(aprWithFee).toBeGreaterThan(aprNoFee);
  });

  it("a larger fee produces a larger APR gap, for the same nominal rate", () => {
    const principal = 500000;
    const nominalRate = 12;
    const tenureMonths = 36;
    const emi = calculateEMI(principal, nominalRate, tenureMonths);

    const { aprPercent: aprSmallFee } = calculateAPR(principal, nominalRate, 1, tenureMonths, emi);
    const { aprPercent: aprBigFee } = calculateAPR(principal, nominalRate, 3, tenureMonths, emi);

    expect(aprBigFee).toBeGreaterThan(aprSmallFee);
  });

  it("fee impact is proportionally larger on shorter tenures (fee is amortized over fewer months)", () => {
    const principal = 500000;
    const nominalRate = 12;
    const fee = 2;

    const emiShort = calculateEMI(principal, nominalRate, 12);
    const emiLong = calculateEMI(principal, nominalRate, 60);

    const { aprPercent: aprShort } = calculateAPR(principal, nominalRate, fee, 12, emiShort);
    const { aprPercent: aprLong } = calculateAPR(principal, nominalRate, fee, 60, emiLong);

    const gapShort = aprShort - nominalRate;
    const gapLong = aprLong - nominalRate;

    expect(gapShort).toBeGreaterThan(gapLong);
  });
});
