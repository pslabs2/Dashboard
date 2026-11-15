import { NextResponse, type NextRequest } from "next/server"

import { buildContentSecurityPolicy, generateNonce } from "@/lib/csp"
import { isAuthEnabled, PUBLIC_PATHS, viewerFromHeaders } from "@/server/auth"

/**
 * Runs before every non-static request:
 *
 * 1. Enforces forward-auth when `AUTH_MODE=proxy`: requests must carry the
 *    identity header set by the authenticating reverse proxy.
 * 2. Issues a per-request nonce and a strict Content Security Policy. Next.js
 *    reads the nonce from the request's CSP header and applies it to its own
 *    scripts; the root layout passes it to next-themes.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    isAuthEnabled() &&
    !PUBLIC_PATHS.has(pathname) &&
    !viewerFromHeaders(request.headers)
  ) {
    const headers = { "Cache-Control": "no-store" }
    return pathname.startsWith("/api/")
      ? NextResponse.json(
          {
            error: {
              code: "UNAUTHENTICATED",
              message: "Authentication required.",
            },
          },
          { status: 401, headers }
        )
      : new NextResponse("Authentication required.", { status: 401, headers })
  }

  const nonce = generateNonce()
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    upgradeInsecureRequests:
      request.nextUrl.protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https",
  })

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", csp)
  return response
}

export const config = {
  matcher: [
    // Everything except build assets. Prefetches are intentionally included
    // so authentication applies to them too.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
  ],
}
