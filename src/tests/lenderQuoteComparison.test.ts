import { describe, it, expect } from "vitest";
import { compareToLenderQuote } from "../rules/lenderQuoteComparison";

describe("compareToLenderQuote", () => {
  const fairRange = { low: 11, high: 12.5 };

  it("flags a quote above the fair range, with the correct gap", () => {
    const result = compareToLenderQuote(fairRange, 14);
    expect(result.verdict).toBe("above_fair_range");
    expect(result.gapPercentagePoints).toBeCloseTo(1.5, 5);
    expect(result.summary).toMatch(/worth pushing back/);
  });

  it("flags a quote below the fair range as a good offer worth double-checking", () => {
    const result = compareToLenderQuote(fairRange, 9.5);
    expect(result.verdict).toBe("below_fair_range");
    expect(result.gapPercentagePoints).toBeLessThan(0);
    expect(result.summary).toMatch(/worth confirming there's no catch/);
  });

  it("treats a quote inside the range as reasonable", () => {
    const result = compareToLenderQuote(fairRange, 12);
    expect(result.verdict).toBe("within_fair_range");
    expect(result.gapPercentagePoints).toBe(0);
  });

  it("treats a quote exactly at either boundary as within range", () => {
    expect(compareToLenderQuote(fairRange, 11).verdict).toBe("within_fair_range");
    expect(compareToLenderQuote(fairRange, 12.5).verdict).toBe("within_fair_range");
  });
});
