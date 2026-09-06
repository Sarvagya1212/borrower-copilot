import type { BorrowerProfile } from "../types/borrower";
import { AGE_PLUS_TENURE_CEILING_YEARS } from "../data/thresholds";

export interface ResolvedTenure {
  tenureMonths: number;
  ageNote: string;
}

/**
 * Applies the age + tenure ≤ AGE_PLUS_TENURE_CEILING_YEARS convention
 * (RULES.md §11) on top of a product's base tenure. Shared by both the
 * unsecured and secured safe-borrowing-amount calculations so the two
 * paths can't silently drift apart on this rule.
 */
export function resolveTenureMonths(profile: BorrowerProfile, baseTenureMonths: number): ResolvedTenure {
  if (profile.age === undefined) {
    return { tenureMonths: baseTenureMonths, ageNote: "" };
  }
  const maxTenureYears = Math.max(1, AGE_PLUS_TENURE_CEILING_YEARS - profile.age);
  const maxTenureMonths = maxTenureYears * 12;
  if (maxTenureMonths >= baseTenureMonths) {
    return { tenureMonths: baseTenureMonths, ageNote: "" };
  }
  return {
    tenureMonths: maxTenureMonths,
    ageNote: ` (shortened from the usual ${baseTenureMonths}-month default to ${maxTenureMonths} months, since a common lender convention caps age + tenure at ${AGE_PLUS_TENURE_CEILING_YEARS} years)`,
  };
}
