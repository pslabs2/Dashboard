import type { NextConfig } from "next"

/**
 * Static security headers. The Content-Security-Policy is per-request (nonce
 * based) and is set in `src/proxy.ts`.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
]

const nextConfig: NextConfig = {
  // Self-contained server bundle for the container image.
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  // Loaded with Node's resolver at runtime instead of being bundled.
  serverExternalPackages: ["@kubernetes/client-node"],
  // `cacheComponents` (and therefore `partialPrefetching`) is intentionally
  // left disabled: every page renders per request so the proxy can attach a
  // CSP nonce, and Partial Prerendering is incompatible with nonce-based CSP.
  // All dashboard data is live anyway. See README > Security model.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
