import "server-only"

import type {
  AppStatus,
  AppStatusResponse,
  AppsResponse,
  LauncherApp,
} from "@/lib/schemas"
import { cached } from "@/server/cache"
import { getDashboardConfig } from "@/server/config"
import { getEnv } from "@/server/env"
import { toDashboardError } from "@/server/errors"
import { discoverApps } from "@/server/k8s/ingress-discovery"
import { listIngresses } from "@/server/k8s/resources"
import { logger } from "@/server/log"

interface ResolvedApp extends LauncherApp {
  /** URL probed for status. Server-only: may be a cluster-internal address. */
  healthUrl: string | null
}

interface ResolvedApps {
  title: string
  subtitle: string | null
  groups: { name: string; apps: ResolvedApp[] }[]
  warnings: string[]
}

const STATUS_TTL_MS = 20_000
const PROBE_CONCURRENCY = 8

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "app"
  )
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`
  } catch {
    return url
  }
}

async function resolveApps(): Promise<ResolvedApps> {
  const config = await getDashboardConfig()
  const warnings: string[] = []
  const usedIds = new Set<string>()
  const knownUrls = new Set<string>()

  const uniqueId = (group: string, name: string) => {
    const base = `${slugify(group)}--${slugify(name)}`
    let id = base
    for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`
    usedIds.add(id)
    return id
  }

  const groups = new Map<string, ResolvedApp[]>()
  const groupApps = (name: string) => {
    let apps = groups.get(name)
    if (!apps) {
      apps = []
      groups.set(name, apps)
    }
    return apps
  }

  for (const group of config.groups) {
    const apps = groupApps(group.name)
    for (const app of group.apps) {
      knownUrls.add(normalizeUrl(app.url))
      const check = app.healthCheck
      apps.push({
        id: uniqueId(group.name, app.name),
        name: app.name,
        url: app.url,
        description: app.description ?? null,
        icon: app.icon ?? null,
        group: group.name,
        source: "config",
        healthCheck: check !== false,
        healthUrl:
          check === false
            ? null
            : typeof check === "object"
              ? check.url
              : app.url,
      })
    }
  }

  const discovery = config.discovery.ingress
  if (discovery.enabled) {
    try {
      const discovered = discoverApps(
        await listIngresses(),
        discovery.defaultGroup
      )
      for (const app of discovered) {
        const key = normalizeUrl(app.url)
        if (knownUrls.has(key)) continue
        knownUrls.add(key)
        groupApps(app.group).push({
          id: uniqueId(app.group, app.name),
          name: app.name,
          url: app.url,
          description: app.description ?? null,
          icon: app.icon ?? null,
          group: app.group,
          source: "ingress",
          healthCheck: app.healthCheck,
          healthUrl: app.healthCheck ? (app.healthUrl ?? app.url) : null,
        })
      }
    } catch (error) {
      const dashboardError = toDashboardError(error, "list ingresses")
      logger.throttled(
        "ingress-discovery",
        "warn",
        "Ingress discovery failed",
        { error }
      )
      warnings.push(`Ingress discovery failed: ${dashboardError.message}`)
    }
  }

  return {
    title: config.title,
    subtitle: config.subtitle ?? null,
    groups: [...groups]
      .filter(([, apps]) => apps.length > 0)
      .map(([name, apps]) => ({ name, apps })),
    warnings,
  }
}

export async function getApps(): Promise<AppsResponse> {
  const resolved = await resolveApps()
  return {
    ...resolved,
    groups: resolved.groups.map((group) => ({
      name: group.name,
      apps: group.apps.map(({ healthUrl, ...app }) => app),
    })),
  }
}

/**
 * Probes a configured URL. Only operator-configured URLs are ever requested;
 * nothing from the browser reaches this function, so it cannot be used for
 * SSRF. Any HTTP response below 500 (including 401/403 from auth walls and
 * redirects to a login page) counts as "up".
 */
async function probe(id: string, url: string): Promise<AppStatus> {
  const started = performance.now()
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: { "user-agent": "homelab-dashboard-healthcheck/1.0" },
      signal: AbortSignal.timeout(getEnv().HEALTHCHECK_TIMEOUT_MS),
    })
    await response.body?.cancel().catch(() => undefined)
    return {
      id,
      status: response.status < 500 ? "up" : "down",
      statusCode: response.status,
      latencyMs: Math.round(performance.now() - started),
      checkedAt: new Date().toISOString(),
    }
  } catch (error) {
    logger.throttled(
      `probe:${id}`,
      "debug",
      "Health check failed",
      { id, error },
      300_000
    )
    return {
      id,
      status: "down",
      statusCode: null,
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    }
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
) {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index] as T)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )
  return results
}

export async function getAppStatuses(): Promise<AppStatusResponse> {
  return cached("apps:status", STATUS_TTL_MS, async () => {
    const { groups } = await resolveApps()
    const targets = groups
      .flatMap((group) => group.apps)
      .filter((app): app is ResolvedApp & { healthUrl: string } =>
        Boolean(app.healthUrl)
      )
    const statuses = await mapWithConcurrency(
      targets,
      PROBE_CONCURRENCY,
      (app) => probe(app.id, app.healthUrl)
    )
    return { generatedAt: new Date().toISOString(), statuses }
  })
}
