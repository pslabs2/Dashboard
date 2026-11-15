/**
 * Parsing for Kubernetes resource quantities ("250m", "1.5Gi", "1e3", ...).
 * See https://kubernetes.io/docs/reference/kubernetes-api/common-definitions/quantity/
 */
const MULTIPLIERS: Record<string, number> = {
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  "": 1,
  k: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
  Ki: 2 ** 10,
  Mi: 2 ** 20,
  Gi: 2 ** 30,
  Ti: 2 ** 40,
  Pi: 2 ** 50,
  Ei: 2 ** 60,
}
const QUANTITY_PATTERN =
  /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:([eE][+-]?\d+)|(Ki|Mi|Gi|Ti|Pi|Ei|n|u|m|k|M|G|T|P|E))?$/
/**
 * Converts a quantity to a plain number in base units (cores for CPU, bytes
 * for memory). Returns `NaN` for malformed input and `0` for missing values.
 */
export function parseQuantity(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  const match = QUANTITY_PATTERN.exec(value.trim())
  if (!match) return Number.NaN
  const [, amount = "0", exponent, suffix = ""] = match
  const base = Number.parseFloat(amount)
  if (exponent) return base * 10 ** Number.parseInt(exponent.slice(1), 10)
  return base * (MULTIPLIERS[suffix] ?? Number.NaN)
}
/** Sums quantities, ignoring malformed values. */
export function sumQuantities(values: Iterable<string | number | undefined>) {
  let total = 0
  for (const value of values) {
    const parsed = parseQuantity(value)
    if (Number.isFinite(parsed)) total += parsed
  }
  return total
}