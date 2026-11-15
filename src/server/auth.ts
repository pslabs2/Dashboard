import { getEnv } from "@/server/env"
/*
 * Forward-auth identity. In `AUTH_MODE=proxy` an authenticating reverse proxy
 * (oauth2-proxy, Authelia, Authentik, Pomerium, ...) sets identity headers,
 * and `src/proxy.ts` rejects requests without them. This module has no
 * Node-only dependencies because the proxy imports it.
 */
export interface Viewer {
  user: string
  email: string | null
}
const MAX_LENGTH = 256
/** Trims, strips control characters and bounds the length of a header value. */
export function sanitizeHeaderValue(value: string | null | undefined) {
  if (!value) return null
  const cleaned = value.replace(/\p{Cc}/gu, "").trim()
  return cleaned ? cleaned.slice(0, MAX_LENGTH) : null
}
export function isAuthEnabled() {
  return getEnv().AUTH_MODE === "proxy"
}
/** Returns the authenticated viewer, or `null` when auth is disabled/missing. */
export function viewerFromHeaders(headers: Headers): Viewer | null {
  const env = getEnv()
  if (env.AUTH_MODE !== "proxy") return null
  const email = sanitizeHeaderValue(headers.get(env.AUTH_PROXY_EMAIL_HEADER))
  const user =
    sanitizeHeaderValue(headers.get(env.AUTH_PROXY_USER_HEADER)) ?? email
  return user ? { user, email } : null
}
/** Paths reachable without identity headers (Kubernetes probes). */
export const PUBLIC_PATHS = new Set(["/api/healthz", "/api/readyz"])