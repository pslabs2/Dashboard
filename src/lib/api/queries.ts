import { queryOptions } from "@tanstack/react-query"

import { apiGet } from "@/lib/api/client"
import {
  AppStatusResponseSchema,
  AppsResponseSchema,
  ArgoResponseSchema,
  ClusterOverviewSchema,
  EventsResponseSchema,
  MetricsHistorySchema,
  NodesResponseSchema,
  PodsResponseSchema,
} from "@/lib/schemas"

/** Polling cadence per resource, in milliseconds. */
export const REFRESH = {
  fast: 10_000,
  normal: 15_000,
  slow: 30_000,
} as const

/**
 * Query definitions shared by Client Components (which fetch the Route
 * Handlers) and Server Components (which prefetch the same keys directly from
 * the server layer and hydrate the client cache).
 */
export const queries = {
  clusterOverview: () =>
    queryOptions({
      queryKey: ["cluster", "overview"],
      queryFn: ({ signal }) =>
        apiGet("/api/v1/cluster", ClusterOverviewSchema, signal),
      refetchInterval: REFRESH.fast,
    }),
  nodes: () =>
    queryOptions({
      queryKey: ["cluster", "nodes"],
      queryFn: ({ signal }) =>
        apiGet("/api/v1/nodes", NodesResponseSchema, signal),
      refetchInterval: REFRESH.normal,
    }),
  pods: () =>
    queryOptions({
      queryKey: ["cluster", "pods"],
      queryFn: ({ signal }) =>
        apiGet("/api/v1/pods", PodsResponseSchema, signal),
      refetchInterval: REFRESH.normal,
    }),
  events: () =>
    queryOptions({
      queryKey: ["cluster", "events"],
      queryFn: ({ signal }) =>
        apiGet("/api/v1/events", EventsResponseSchema, signal),
      refetchInterval: REFRESH.normal,
    }),
  metricsHistory: () =>
    queryOptions({
      queryKey: ["cluster", "metrics-history"],
      queryFn: ({ signal }) =>
        apiGet("/api/v1/metrics/history", MetricsHistorySchema, signal),
      refetchInterval: REFRESH.normal,
    }),
  argoApplications: () =>
    queryOptions({
      queryKey: ["argocd", "applications"],
      queryFn: ({ signal }) =>
        apiGet("/api/v1/argocd/applications", ArgoResponseSchema, signal),
      refetchInterval: REFRESH.normal,
    }),
  apps: () =>
    queryOptions({
      queryKey: ["apps"],
      queryFn: ({ signal }) =>
        apiGet("/api/v1/apps", AppsResponseSchema, signal),
      refetchInterval: REFRESH.slow * 2,
    }),
  appStatus: () =>
    queryOptions({
      queryKey: ["apps", "status"],
      queryFn: ({ signal }) =>
        apiGet("/api/v1/apps/status", AppStatusResponseSchema, signal),
      refetchInterval: REFRESH.slow,
    }),
}
