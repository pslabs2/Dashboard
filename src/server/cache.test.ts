import { beforeEach, describe, expect, it, vi } from "vitest"

import { cached, clearCache } from "@/server/cache"

beforeEach(() => {
  clearCache()
})

describe("cached", () => {
  it("coalesces concurrent calls and caches within the TTL", async () => {
    const loader = vi.fn(async () => 42)
    const results = await Promise.all([
      cached("k", 1000, loader),
      cached("k", 1000, loader),
    ])
    expect(results).toEqual([42, 42])
    expect(await cached("k", 1000, loader)).toBe(42)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it("does not cache failures", async () => {
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok")
    await expect(cached("f", 1000, loader)).rejects.toThrow("boom")
    expect(await cached("f", 1000, loader)).toBe("ok")
  })

  it("reloads after the TTL expires", async () => {
    const loader = vi.fn(async () => Date.now())
    await cached("t", 0, loader)
    await new Promise((resolve) => setTimeout(resolve, 2))
    await cached("t", 0, loader)
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
