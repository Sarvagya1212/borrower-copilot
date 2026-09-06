import { calculateEMI } from "./emi";

export interface TenureOption {
  tenureMonths: number;
  emi: number;
}

/**
 * O4's "approximate EMI at different tenures" — pure arithmetic, repeating
 * calculateEMI across a set of tenure options. No judgement lives here;
 * which tenures to default to is in src/data/thresholds.ts
 * (TENURE_COMPARISON_OPTIONS_MONTHS), and whether a given EMI is safe is
 * decided in src/rules/, not here.
 */
export function calculateEMIAcrossTenures(
  principal: number,
  annualRatePercent: number,
  tenureOptionsMonths: number[],
): TenureOption[] {
  return tenureOptionsMonths.map((tenureMonths) => ({
    tenureMonths,
    emi: Math.round(calculateEMI(principal, annualRatePercent, tenureMonths)),
  }));
}
