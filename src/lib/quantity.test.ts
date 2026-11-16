import { describe, expect, it } from "vitest"

import { parseQuantity, sumQuantities } from "@/lib/quantity"

describe("parseQuantity", () => {
  it.each([
    ["250m", 0.25],
    ["2", 2],
    ["1.5Gi", 1.5 * 2 ** 30],
    ["128Mi", 128 * 2 ** 20],
    ["1k", 1000],
    ["1e3", 1000],
    ["100n", 100e-9],
    [".5", 0.5],
  ])("parses %s", (input, expected) => {
    expect(parseQuantity(input)).toBeCloseTo(expected)
  })

  it("returns 0 for missing and NaN for malformed values", () => {
    expect(parseQuantity(undefined)).toBe(0)
    expect(parseQuantity("abc")).toBeNaN()
    expect(parseQuantity("1Xi")).toBeNaN()
  })

  it("sums while ignoring malformed values", () => {
    expect(sumQuantities(["500m", "bad", "1", undefined])).toBeCloseTo(1.5)
  })
})
