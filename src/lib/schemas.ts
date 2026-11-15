/**
 * API contract shared by the Route Handlers (as types) and the browser (as
 * runtime validation of every response). Keep this module isomorphic.
 */
import { z } from "zod"

const isoDate = z.iso.datetime({ offset: true })
const count = z.number().int().nonnegative()

export const ErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})
export type ErrorBody = z.infer<typeof ErrorBodySchema>

/* -------------------------------------------------------------------------- */
/* Cluster                                                                    */
/* -------------------------------------------------------------------------- */

/** CPU values are in cores, memory values in bytes. */
export const ResourceStatSchema = z.object({
  /** Live usage from metrics-server, `null` when metrics are unavailable. */
  used: z.number().nonnegative().nullable(),
  requested: z.number().nonnegative(),
  allocatable: z.number().nonnegative(),
})
export type ResourceStat = z.infer<typeof ResourceStatSchema>

const ReadyCountSchema = z.object({ ready: count, total: count })

export const ClusterOverviewSchema = z.object({
  generatedAt: isoDate,
  version: z.string().nullable(),
  metricsAvailable: z.boolean(),
  nodes: ReadyCountSchema,
  pods: z.object({
    total: count,
    running: count,
    pending: count,
    succeeded: count,
    failed: count,
    unknown: count,
    unhealthy: count,
  }),
  namespaces: count,
  workloads: z.object({
    deployments: ReadyCountSchema,
    statefulSets: ReadyCountSchema,
    daemonSets: ReadyCountSchema,
  }),
  cpu: ResourceStatSchema,
  memory: ResourceStatSchema,
})
export type ClusterOverview = z.infer<typeof ClusterOverviewSchema>

export const NodeConditionSchema = z.object({
  type: z.string(),
  status: z.string(),
  reason: z.string().nullable(),
  message: z.string().nullable(),
})

export const NodeSummarySchema = z.object({
  name: z.string(),
  ready: z.boolean(),
  schedulable: z.boolean(),
  roles: z.array(z.string()),
  kubeletVersion: z.string().nullable(),
  osImage: z.string().nullable(),
  kernelVersion: z.string().nullable(),
  containerRuntime: z.string().nullable(),
  architecture: z.string().nullable(),
  internalIP: z.string().nullable(),
  createdAt: isoDate.nullable(),
  /** Only conditions that indicate a problem. */
  problems: z.array(NodeConditionSchema),
  pods: z.object({ running: count, capacity: count }),
  cpu: ResourceStatSchema,
  memory: ResourceStatSchema,
})
export type NodeSummary = z.infer<typeof NodeSummarySchema>

export const NodesResponseSchema = z.object({
  generatedAt: isoDate,
  metricsAvailable: z.boolean(),
  nodes: z.array(NodeSummarySchema),
})
export type NodesResponse = z.infer<typeof NodesResponseSchema>

export const SeveritySchema = z.enum(["ok", "warning", "error"])
export type Severity = z.infer<typeof SeveritySchema>

export const PodSummarySchema = z.object({
  name: z.string(),
  namespace: z.string(),
  phase: z.string(),
  /** kubectl-style status, e.g. `Running`, `CrashLoopBackOff`, `Completed`. */
  status: z.string(),
  severity: SeveritySchema,
  readyContainers: count,
  totalContainers: count,
  restarts: count,
  node: z.string().nullable(),
  ownerKind: z.string().nullable(),
  createdAt: isoDate.nullable(),
  cpuCores: z.number().nonnegative().nullable(),
  memoryBytes: z.number().nonnegative().nullable(),
})
export type PodSummary = z.infer<typeof PodSummarySchema>

export const PodsResponseSchema = z.object({
  generatedAt: isoDate,
  metricsAvailable: z.boolean(),
  namespaces: z.array(z.string()),
  pods: z.array(PodSummarySchema),
})
export type PodsResponse = z.infer<typeof PodsResponseSchema>

export const ClusterEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  reason: z.string().nullable(),
  message: z.string().nullable(),
  namespace: z.string().nullable(),
  object: z.object({
    kind: z.string().nullable(),
    name: z.string().nullable(),
  }),
  count: count,
  lastSeen: isoDate.nullable(),
})
export type ClusterEvent = z.infer<typeof ClusterEventSchema>

export const EventsResponseSchema = z.object({
  generatedAt: isoDate,
  events: z.array(ClusterEventSchema),
})
export type EventsResponse = z.infer<typeof EventsResponseSchema>

export const MetricsSampleSchema = z.object({
  timestamp: z.number().int(),
  cpuCores: z.number().nonnegative(),
  memoryBytes: z.number().nonnegative(),
})
export type MetricsSample = z.infer<typeof MetricsSampleSchema>

export const MetricsHistorySchema = z.object({
  generatedAt: isoDate,
  intervalMs: z.number().int().positive(),
  capacity: z.object({
    cpuCores: z.number().nonnegative(),
    memoryBytes: z.number().nonnegative(),
  }),
  samples: z.array(MetricsSampleSchema),
})
export type MetricsHistory = z.infer<typeof MetricsHistorySchema>

/* -------------------------------------------------------------------------- */
/* Argo CD                                                                    */
/* -------------------------------------------------------------------------- */

export const SYNC_STATUSES = ["Synced", "OutOfSync", "Unknown"] as const
export const HEALTH_STATUSES = [
  "Healthy",
  "Progressing",
  "Degraded",
  "Suspended",
  "Missing",
  "Unknown",
] as const

export const SyncStatusSchema = z.enum(SYNC_STATUSES)
export const HealthStatusSchema = z.enum(HEALTH_STATUSES)
export type SyncStatus = z.infer<typeof SyncStatusSchema>
export type HealthStatus = z.infer<typeof HealthStatusSchema>

export const ArgoApplicationSchema = z.object({
  name: z.string(),
  namespace: z.string(),
  project: z.string(),
  syncStatus: SyncStatusSchema,
  healthStatus: HealthStatusSchema,
  autoSync: z.boolean(),
  revision: z.string().nullable(),
  source: z.object({
    repoURL: z.string().nullable(),
    path: z.string().nullable(),
    chart: z.string().nullable(),
    targetRevision: z.string().nullable(),
    count: count,
  }),
  destination: z.object({
    server: z.string().nullable(),
    namespace: z.string().nullable(),
  }),
  operation: z
    .object({
      phase: z.string(),
      message: z.string().nullable(),
      finishedAt: isoDate.nullable(),
    })
    .nullable(),
  reconciledAt: isoDate.nullable(),
  conditions: z.array(z.object({ type: z.string(), message: z.string() })),
  resourceCount: count,
  /** Deep link into the Argo CD UI when `argocd.url` is configured. */
  url: z.string().nullable(),
})
export type ArgoApplication = z.infer<typeof ArgoApplicationSchema>

export const ArgoSummarySchema = z.object({
  total: count,
  synced: count,
  outOfSync: count,
  healthy: count,
  progressing: count,
  degraded: count,
})
export type ArgoSummary = z.infer<typeof ArgoSummarySchema>

export const ArgoResponseSchema = z.object({
  generatedAt: isoDate,
  /** `false` when the Application CRD is not installed in the cluster. */
  installed: z.boolean(),
  uiUrl: z.string().nullable(),
  summary: ArgoSummarySchema,
  applications: z.array(ArgoApplicationSchema),
})
export type ArgoResponse = z.infer<typeof ArgoResponseSchema>

/* -------------------------------------------------------------------------- */
/* Application launcher                                                       */
/* -------------------------------------------------------------------------- */

export const LauncherAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  group: z.string(),
  source: z.enum(["config", "ingress"]),
  healthCheck: z.boolean(),
})
export type LauncherApp = z.infer<typeof LauncherAppSchema>

export const AppsResponseSchema = z.object({
  title: z.string(),
  subtitle: z.string().nullable(),
  groups: z.array(
    z.object({ name: z.string(), apps: z.array(LauncherAppSchema) })
  ),
  /** Non-fatal problems, e.g. Ingress discovery failed. */
  warnings: z.array(z.string()),
})
export type AppsResponse = z.infer<typeof AppsResponseSchema>

export const AppStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["up", "down", "unknown"]),
  statusCode: z.number().int().nullable(),
  latencyMs: z.number().nonnegative().nullable(),
  checkedAt: isoDate,
})
export type AppStatus = z.infer<typeof AppStatusSchema>

export const AppStatusResponseSchema = z.object({
  generatedAt: isoDate,
  statuses: z.array(AppStatusSchema),
})
export type AppStatusResponse = z.infer<typeof AppStatusResponseSchema>

/** DNS-1123 label, used to validate namespace query parameters. */
export const NamespaceSchema = z
  .string()
  .max(63)
  .regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, "Invalid namespace")
