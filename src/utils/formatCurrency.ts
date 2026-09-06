/**
 * Formats a number as an Indian-grouped rupee string, e.g. 800000 -> "₹8,00,000".
 * Written manually rather than relying on `toLocaleString("en-IN")` so
 * formatting doesn't silently depend on the runtime's ICU data being
 * present/complete.
 */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount);
  const isNegative = rounded < 0;
  const digits = Math.abs(rounded).toString();

  const lastThree = digits.length > 3 ? digits.slice(-3) : digits;
  const rest = digits.length > 3 ? digits.slice(0, -3) : "";
  const restGrouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  const grouped = restGrouped ? `${restGrouped},${lastThree}` : lastThree;
  return `${isNegative ? "-" : ""}₹${grouped}`;
}
