import { describe, it, expect } from "vitest";
import { formatINR } from "../utils/formatCurrency";

describe("formatINR", () => {
  it("formats a value under 1000 with no grouping", () => {
    expect(formatINR(500)).toBe("₹500");
  });

  it("formats a value in the thousands", () => {
    expect(formatINR(22000)).toBe("₹22,000");
  });

  it("formats a value in the lakhs with Indian grouping", () => {
    expect(formatINR(800000)).toBe("₹8,00,000");
  });

  it("formats a value in the crores with Indian grouping", () => {
    expect(formatINR(15000000)).toBe("₹1,50,00,000");
  });

  it("formats a negative value", () => {
    expect(formatINR(-4500)).toBe("-₹4,500");
  });

  it("rounds non-integer input", () => {
    expect(formatINR(1234.6)).toBe("₹1,235");
  });
});
