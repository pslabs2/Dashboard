import "server-only"
import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { parse as parseYaml } from "yaml"
import { z } from "zod"
import { NamespaceSchema } from "@/lib/schemas"
import { getEnv } from "@/server/env"
import { logger } from "@/server/log"
const httpUrl = z.url({
  protocol: /^https?$/,
  error: "Must be an absolute http(s) URL",
})
const HealthCheckSchema = z.union([
  z.boolean(),
  z.strictObject({
    /** Probe this URL instead of `url`, e.g. a cluster-internal Service. */
    url: httpUrl,
  }),
])
const AppConfigSchema = z.strictObject({
  name: z.string().trim().min(1).max(64),
  url: httpUrl,
  description: z.string().trim().max(200).optional(),
  /** Lucide icon name (e.g. `film`) or an absolute image URL. */
  icon: z.string().trim().max(2048).optional(),
  healthCheck: HealthCheckSchema.default(true),
})
const GroupConfigSchema = z.strictObject({
  name: z.string().trim().min(1).max(64),
  apps: z.array(AppConfigSchema).default([]),
})
export const DashboardConfigSchema = z.strictObject({
  title: z.string().trim().min(1).max(64).default("Homelab"),
  subtitle: z.string().trim().max(200).optional(),
  argocd: z
    .strictObject({
      /** Public Argo CD URL, used for deep links. */
      url: httpUrl.optional(),
      /** Only list Applications in this namespace (default: all namespaces). */
      namespace: NamespaceSchema.optional(),
    })
    .prefault({}),
  discovery: z
    .strictObject({
      ingress: z
        .strictObject({
          /** Add Ingresses annotated `dashboard.homelab/enabled: "true"`. */
          enabled: z.boolean().default(false),
          defaultGroup: z.string().trim().min(1).max(64).default("Discovered"),
        })
        .prefault({}),
    })
    .prefault({}),
  groups: z.array(GroupConfigSchema).default([]),
})
export type DashboardConfig = z.infer<typeof DashboardConfigSchema>
export type AppConfig = z.infer<typeof AppConfigSchema>
export class ConfigError extends Error {
  override name = "ConfigError"
}
/** Parses and validates YAML config text. Exported for tests. */
export function parseDashboardConfig(source: string): DashboardConfig {
  let raw: unknown
  try {
    raw = parseYaml(source) ?? {}
  } catch (error) {
    throw new ConfigError(
      `Dashboard config is not valid YAML: ${(error as Error).message}`
    )
  }
  const result = DashboardConfigSchema.safeParse(raw)
  if (!result.success) {
    throw new ConfigError(
      `Dashboard config is invalid:\n${z.prettifyError(result.error)}`
    )
  }
  return result.data
}
interface LoadedConfig {
  config: DashboardConfig
  mtimeMs: number
}
const STATE_KEY = Symbol.for("homelab-dashboard.config")
const globalState = globalThis as unknown as Record<
  symbol,
  { current?: LoadedConfig }
>
const state = (globalState[STATE_KEY] ??= {})
/**
 * Loads the dashboard config, re-reading it whenever the file changes so
 * ConfigMap updates apply without a restart. A missing file yields defaults.
 */
export async function getDashboardConfig(): Promise<DashboardConfig> {
  const file = path.resolve(process.cwd(), getEnv().DASHBOARD_CONFIG_PATH)
  let mtimeMs: number
  try {
    mtimeMs = (await stat(file)).mtimeMs
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      logger.throttled("config-missing", "warn", "Dashboard config not found, using defaults", { file })
      return DashboardConfigSchema.parse({})
    }
    throw error
  }
  if (state.current?.mtimeMs === mtimeMs) return state.current.config
  const config = parseDashboardConfig(await readFile(file, "utf8"))
  state.current = { config, mtimeMs }
  logger.info("Loaded dashboard config", { file })
  return config
}