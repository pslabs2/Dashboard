import { z } from "zod"

/**
 * Runtime configuration from environment variables. Validated lazily on first
 * use so `next build` does not depend on deployment-time settings.
 *
 * This module is imported by `src/proxy.ts`, so it must stay free of Node-only
 * dependencies.
 */
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  /** Path to the YAML dashboard configuration (apps, groups, Argo CD link). */
  DASHBOARD_CONFIG_PATH: z.string().min(1).default("config/dashboard.yaml"),
  /**
   * `proxy`: require an identity header set by a forward-auth proxy
   * (oauth2-proxy, Authelia, Authentik, ...). `none`: no authentication.
   */
  AUTH_MODE: z.enum(["none", "proxy"]).default("none"),
  AUTH_PROXY_USER_HEADER: z
    .string()
    .min(1)
    .toLowerCase()
    .default("x-auth-request-user"),
  AUTH_PROXY_EMAIL_HEADER: z
    .string()
    .min(1)
    .toLowerCase()
    .default("x-auth-request-email"),
  K8S_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(500)
    .max(60_000)
    .default(8_000),
  /** Server-side cache for Kubernetes reads, shared by all browser tabs. */
  K8S_CACHE_TTL_MS: z.coerce.number().int().min(0).max(60_000).default(4_000),
  METRICS_SAMPLE_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(5_000)
    .max(300_000)
    .default(15_000),
  METRICS_HISTORY_POINTS: z.coerce
    .number()
    .int()
    .min(10)
    .max(10_000)
    .default(240),
  HEALTHCHECK_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(500)
    .max(30_000)
    .default(5_000),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | undefined

export function getEnv(): Env {
  if (cached) return cached
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${z.prettifyError(result.error)}`
    )
  }
  cached = result.data
  return cached
}
