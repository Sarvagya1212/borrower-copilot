// Pure arithmetic only. No thresholds, no bands, no lending judgement here —
// see src/rules/ for anything that decides what a borrower should do.

/**
 * Standard reducing-balance EMI formula.
 *
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 *
 * where r is the *monthly* rate (annualRatePercent / 12 / 100).
 *
 * @param principal        Loan amount, INR.
 * @param annualRatePercent Nominal annual interest rate, e.g. 12.5 for 12.5%.
 * @param tenureMonths     Loan tenure in months.
 */
export function calculateEMI(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number,
): number {
  if (principal <= 0 || tenureMonths <= 0) {
    throw new Error("calculateEMI: principal and tenureMonths must be positive");
  }

  const monthlyRate = annualRatePercent / 12 / 100;

  // Zero-rate edge case: the formula below divides by ((1+r)^n - 1), which
  // is 0 when r = 0. A 0% loan is just principal spread evenly.
  if (monthlyRate === 0) {
    return principal / tenureMonths;
  }

  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/**
 * Inverse of calculateEMI: given a maximum EMI a lender/borrower can carry,
 * what principal does that correspond to at a given rate and tenure?
 *
 * principal = EMI * ((1+r)^n - 1) / (r * (1+r)^n)
 */
export function calculatePrincipalFromEMI(
  emi: number,
  annualRatePercent: number,
  tenureMonths: number,
): number {
  if (emi <= 0) return 0;
  if (tenureMonths <= 0) {
    throw new Error("calculatePrincipalFromEMI: tenureMonths must be positive");
  }

  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) {
    return emi * tenureMonths;
  }

  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return (emi * (factor - 1)) / (monthlyRate * factor);
}

/**
 * Total interest paid over the life of the loan at a given EMI.
 * Simple derived quantity, useful for showing "total cost" alongside EMI.
 */
export function calculateTotalInterest(
  principal: number,
  emi: number,
  tenureMonths: number,
): number {
  return emi * tenureMonths - principal;
}

/**
 * Inverse of calculateEMI: given an EMI a borrower can afford, what
 * principal does that translate to at a given rate and tenure?
 *
 * principal = EMI * (1 - (1+r)^-n) / r
 *
 * Used by calculateLikelySanction to convert an income-based EMI headroom
 * into a comparable principal figure — see RULES.md §3.
 */
export function principalFromEMI(
  emi: number,
  annualRatePercent: number,
  tenureMonths: number,
): number {
  if (emi <= 0 || tenureMonths <= 0) return 0;

  const monthlyRate = annualRatePercent / 12 / 100;
  if (monthlyRate === 0) {
    return emi * tenureMonths;
  }

  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return (emi * (factor - 1)) / (monthlyRate * factor);
}

export interface TenureOption {
  tenureMonths: number;
  emi: number;
  totalInterest: number;
}

/**
 * Pure arithmetic table generator for the O4 "EMI at different tenures"
 * display — no judgement, just calculateEMI applied across a list of
 * tenure options.
 */
export function emiAcrossTenures(
  principal: number,
  annualRatePercent: number,
  tenureOptionsMonths: number[],
): TenureOption[] {
  return tenureOptionsMonths.map((tenureMonths) => {
    const emi = calculateEMI(principal, annualRatePercent, tenureMonths);
    return {
      tenureMonths,
      emi,
      totalInterest: calculateTotalInterest(principal, emi, tenureMonths),
    };
  });
}
