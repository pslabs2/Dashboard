import { z } from "zod"

import {
  HEALTH_STATUSES,
  SYNC_STATUSES,
  type ArgoApplication,
  type ArgoSummary,
  type HealthStatus,
  type SyncStatus,
} from "@/lib/schemas"
import { toIso } from "@/server/k8s/dates"

/*
 * Pure model for Argo CD `Application` custom resources. The schema is
 * deliberately lenient: unknown fields are ignored and malformed optional
 * fields fall back to `undefined` so one odd resource never breaks the page.
 */

const str = z.string().optional().catch(undefined)

const SourceSchema = z.object({
  repoURL: str,
  path: str,
  chart: str,
  targetRevision: str,
})

export const RawApplicationSchema = z.object({
  metadata: z.object({
    name: z.string(),
    namespace: z.string().default("argocd"),
  }),
  spec: z
    .object({
      project: str,
      source: SourceSchema.optional().catch(undefined),
      sources: z.array(SourceSchema).optional().catch(undefined),
      destination: z
        .object({ server: str, name: str, namespace: str })
        .optional()
        .catch(undefined),
      syncPolicy: z
        .object({
          automated: z
            .object({ enabled: z.boolean().optional().catch(undefined) })
            .nullish()
            .catch(undefined),
        })
        .nullish()
        .catch(undefined),
    })
    .default({}),
  status: z
    .object({
      sync: z
        .object({
          status: str,
          revision: str,
          revisions: z.array(z.string()).optional().catch(undefined),
        })
        .optional()
        .catch(undefined),
      health: z.object({ status: str }).optional().catch(undefined),
      operationState: z
        .object({ phase: z.string(), message: str, finishedAt: str })
        .optional()
        .catch(undefined),
      reconciledAt: str,
      conditions: z
        .array(z.object({ type: z.string(), message: z.string().default("") }))
        .optional()
        .catch(undefined),
      resources: z.array(z.unknown()).optional().catch(undefined),
    })
    .default({}),
})

export type RawApplication = z.infer<typeof RawApplicationSchema>

const syncStatuses: ReadonlySet<string> = new Set(SYNC_STATUSES)
const healthStatuses: ReadonlySet<string> = new Set(HEALTH_STATUSES)

function toSyncStatus(value: string | undefined): SyncStatus {
  return value && syncStatuses.has(value) ? (value as SyncStatus) : "Unknown"
}

function toHealthStatus(value: string | undefined): HealthStatus {
  return value && healthStatuses.has(value)
    ? (value as HealthStatus)
    : "Unknown"
}

/** Normalizes an Argo CD UI base URL (no trailing slash), or `null`. */
export function normalizeUiUrl(url: string | undefined | null) {
  return url ? url.replace(/\/+$/, "") : null
}

export function applicationUrl(
  uiUrl: string | null,
  namespace: string,
  name: string
) {
  if (!uiUrl) return null
  return `${uiUrl}/applications/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`
}

export function normalizeApplication(
  raw: RawApplication,
  uiUrl: string | null
): ArgoApplication {
  const { metadata, spec, status } = raw
  const sources = spec.sources?.length
    ? spec.sources
    : spec.source
      ? [spec.source]
      : []
  const primary = sources[0]
  const automated = spec.syncPolicy?.automated
  const destination = spec.destination
  const operation = status.operationState

  return {
    name: metadata.name,
    namespace: metadata.namespace,
    project: spec.project ?? "default",
    syncStatus: toSyncStatus(status.sync?.status),
    healthStatus: toHealthStatus(status.health?.status),
    autoSync: automated != null && automated.enabled !== false,
    revision: status.sync?.revision ?? status.sync?.revisions?.[0] ?? null,
    source: {
      repoURL: primary?.repoURL ?? null,
      path: primary?.path ?? null,
      chart: primary?.chart ?? null,
      targetRevision: primary?.targetRevision ?? null,
      count: sources.length,
    },
    destination: {
      server: destination?.server ?? destination?.name ?? null,
      namespace: destination?.namespace ?? null,
    },
    operation: operation
      ? {
          phase: operation.phase,
          message: operation.message ?? null,
          finishedAt: toIso(operation.finishedAt),
        }
      : null,
    reconciledAt: toIso(status.reconciledAt),
    conditions: (status.conditions ?? []).map((c) => ({
      type: c.type,
      message: c.message,
    })),
    resourceCount: status.resources?.length ?? 0,
    url: applicationUrl(uiUrl, metadata.namespace, metadata.name),
  }
}

export function summarizeApplications(apps: ArgoApplication[]): ArgoSummary {
  const summary: ArgoSummary = {
    total: apps.length,
    synced: 0,
    outOfSync: 0,
    healthy: 0,
    progressing: 0,
    degraded: 0,
  }
  for (const app of apps) {
    if (app.syncStatus === "Synced") summary.synced += 1
    if (app.syncStatus === "OutOfSync") summary.outOfSync += 1
    if (app.healthStatus === "Healthy") summary.healthy += 1
    if (app.healthStatus === "Progressing") summary.progressing += 1
    if (app.healthStatus === "Degraded" || app.healthStatus === "Missing")
      summary.degraded += 1
  }
  return summary
}

/**
 * Parses a list response, skipping items that do not look like Applications.
 * Returns the number of skipped items so callers can log it.
 */
export function parseApplicationList(body: unknown, uiUrl: string | null) {
  const items = (body as { items?: unknown } | null)?.items
  const applications: ArgoApplication[] = []
  let skipped = 0
  for (const item of Array.isArray(items) ? items : []) {
    const parsed = RawApplicationSchema.safeParse(item)
    if (parsed.success)
      applications.push(normalizeApplication(parsed.data, uiUrl))
    else skipped += 1
  }
  applications.sort(
    (a, b) =>
      a.name.localeCompare(b.name) || a.namespace.localeCompare(b.namespace)
  )
  return { applications, skipped }
}
