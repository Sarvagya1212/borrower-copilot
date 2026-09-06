// Pure arithmetic only — see note at the top of emi.ts.

/**
 * Net present value of a cash-flow stream at a given periodic rate.
 * cashflows[0] is the flow at t=0 (typically negative — money going out
 * of the lender's / into the borrower's hands), cashflows[i] is the flow
 * at period i.
 */
function npv(rate: number, cashflows: number[]): number {
  return cashflows.reduce((sum, cf, i) => sum + cf / Math.pow(1 + rate, i), 0);
}

function npvDerivative(rate: number, cashflows: number[]): number {
  return cashflows.reduce(
    (sum, cf, i) => (i === 0 ? sum : sum - (i * cf) / Math.pow(1 + rate, i + 1)),
    0,
  );
}

/**
 * Solves for the periodic internal rate of return of a cash-flow stream.
 *
 * Newton-Raphson first (fast, usually converges in a handful of iterations
 * for well-behaved loan cash flows). Falls back to bisection over a wide
 * bracket if Newton-Raphson fails to converge or walks outside a sane
 * range — loan cash-flow streams are simple (one sign change) so bisection
 * is guaranteed to work as a backstop, just slower.
 *
 * @returns the periodic rate as a decimal (e.g. 0.01 for 1% per period)
 */
export function solveIRR(cashflows: number[], guess = 0.02): number {
  const maxIterations = 100;
  const tolerance = 1e-9;

  // --- Newton-Raphson ---
  let rate = guess;
  for (let i = 0; i < maxIterations; i++) {
    const value = npv(rate, cashflows);
    const derivative = npvDerivative(rate, cashflows);
    if (Math.abs(derivative) < 1e-12) break; // avoid divide-by-near-zero, fall through to bisection
    const nextRate = rate - value / derivative;
    if (Math.abs(nextRate - rate) < tolerance) {
      return nextRate;
    }
    rate = nextRate;
    if (!Number.isFinite(rate) || rate <= -0.999) break; // walked off into nonsense, fall through
  }

  // --- Bisection fallback ---
  let low = -0.9;
  let high = 5; // 500% per period ceiling — loan rates never approach this; a safe wide bracket
  let lowValue = npv(low, cashflows);
  const highValue = npv(high, cashflows);

  if (Math.sign(lowValue) === Math.sign(highValue)) {
    // No sign change in the bracket — the cash-flow stream is malformed
    // (e.g. all positive or all negative). Fail loudly rather than return
    // a meaningless number.
    throw new Error("solveIRR: could not bracket a root — check cash-flow signs");
  }

  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    const midValue = npv(mid, cashflows);
    if (Math.abs(midValue) < tolerance) return mid;
    if (Math.sign(midValue) === Math.sign(lowValue)) {
      low = mid;
      lowValue = midValue;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}

export interface APRResult {
  /** Effective annual rate, as a percentage (e.g. 13.8 for 13.8%). */
  aprPercent: number;
  monthlyRate: number;
  /** The nominal rate this was computed from — kept alongside aprPercent so
   *  callers can show "nominal X% vs. all-in Y%" without re-threading the
   *  input separately. */
  nominalRatePercent: number;
}

/**
 * Computes the borrower's true effective annual cost (APR) from the real
 * cash-flow stream: they receive the principal minus the upfront processing
 * fee, then pay a fixed EMI every month for the tenure.
 *
 * ASSUMPTION (flagged in RULES.md §6): the fee is deducted from the
 * disbursal, not financed into the loan amount. Some lenders do the latter,
 * which would change the real APR — the borrower should confirm this with
 * the actual lender.
 */
export function calculateAPR(
  principal: number,
  annualRatePercent: number,
  processingFeePercent: number,
  tenureMonths: number,
  emi: number,
): APRResult {
  const fee = principal * (processingFeePercent / 100);
  const disbursal = principal - fee;

  const cashflows: number[] = [-disbursal, ...Array(tenureMonths).fill(emi)];

  const monthlyRate = solveIRR(cashflows);
  const aprPercent = (Math.pow(1 + monthlyRate, 12) - 1) * 100;

  return { aprPercent, monthlyRate, nominalRatePercent: annualRatePercent };
}
