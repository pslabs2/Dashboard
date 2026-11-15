export interface CspOptions {
  nonce: string
  isDev: boolean
  /** Add `upgrade-insecure-requests` (only when served over HTTPS). */
  upgradeInsecureRequests: boolean
}

/**
 * Builds a strict, nonce-based Content Security Policy.
 *
 * - Scripts: only nonce-bearing scripts and what they load (`strict-dynamic`).
 * - Styles: `'unsafe-inline'` is required because Radix UI and Recharts set
 *   inline `style` attributes during SSR; style injection cannot execute code.
 * - Images: `https:` so application icons can come from icon CDNs.
 */
export function buildContentSecurityPolicy({
  nonce,
  isDev,
  upgradeInsecureRequests,
}: CspOptions) {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // React uses eval() in development for enhanced error stacks.
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(isDev ? ["ws:", "wss:"] : [])],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  }

  const policy = Object.entries(directives).map(
    ([name, values]) => `${name} ${values.join(" ")}`
  )
  if (upgradeInsecureRequests) policy.push("upgrade-insecure-requests")
  return policy.join("; ")
}

export function generateNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}
