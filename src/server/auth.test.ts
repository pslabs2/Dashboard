import { afterEach, describe, expect, it, vi } from "vitest"

async function loadAuth(env: Record<string, string>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  return import("@/server/auth")
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("viewerFromHeaders", () => {
  it("returns null when auth is disabled", async () => {
    const { viewerFromHeaders } = await loadAuth({ AUTH_MODE: "none" })
    expect(
      viewerFromHeaders(new Headers({ "x-auth-request-user": "alice" }))
    ).toBeNull()
  })

  it("reads and sanitizes proxy identity headers", async () => {
    const { viewerFromHeaders } = await loadAuth({ AUTH_MODE: "proxy" })
    expect(
      viewerFromHeaders(
        new Headers({
          "x-auth-request-user": "  alice ",
          "x-auth-request-email": "alice@example.com",
        })
      )
    ).toEqual({ user: "alice", email: "alice@example.com" })
    expect(viewerFromHeaders(new Headers())).toBeNull()
  })

  it("falls back to the email and honors custom header names", async () => {
    const { viewerFromHeaders } = await loadAuth({
      AUTH_MODE: "proxy",
      AUTH_PROXY_EMAIL_HEADER: "Remote-Email",
    })
    expect(
      viewerFromHeaders(new Headers({ "remote-email": "bob@example.com" }))
    ).toEqual({ user: "bob@example.com", email: "bob@example.com" })
  })
})

describe("sanitizeHeaderValue", () => {
  it("strips control characters and bounds length", async () => {
    const { sanitizeHeaderValue } = await loadAuth({})
    expect(sanitizeHeaderValue("a\u0000b\nc")).toBe("abc")
    expect(sanitizeHeaderValue("x".repeat(1000))).toHaveLength(256)
    expect(sanitizeHeaderValue("   ")).toBeNull()
  })
})
