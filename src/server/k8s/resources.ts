import "server-only"

import type {
  CoreV1Event,
  V1DaemonSet,
  V1Deployment,
  V1Ingress,
  V1Namespace,
  V1Node,
  V1Pod,
  V1StatefulSet,
} from "@kubernetes/client-node"
import { z } from "zod"

import { cached } from "@/server/cache"
import { getEnv } from "@/server/env"
import { apiStatusCode } from "@/server/errors"
import { getKubernetes, requestOptions } from "@/server/k8s/client"
import { logger } from "@/server/log"

/*
 * Thin, cached readers for the Kubernetes resources the dashboard uses. Every
 * read is coalesced across concurrent requests and kept for K8S_CACHE_TTL_MS.
 */

const ttl = () => getEnv().K8S_CACHE_TTL_MS

export const listNodes = (): Promise<V1Node[]> =>
  cached("k8s:nodes", ttl(), async () => {
    const { core } = getKubernetes()
    return (await core.listNode({}, requestOptions())).items
  })

export const listPods = (): Promise<V1Pod[]> =>
  cached("k8s:pods", ttl(), async () => {
    const { core } = getKubernetes()
    return (await core.listPodForAllNamespaces({}, requestOptions())).items
  })

export const listNamespaces = (): Promise<V1Namespace[]> =>
  cached("k8s:namespaces", ttl() * 4, async () => {
    const { core } = getKubernetes()
    return (await core.listNamespace({}, requestOptions())).items
  })

export const listDeployments = (): Promise<V1Deployment[]> =>
  cached("k8s:deployments", ttl(), async () => {
    const { apps } = getKubernetes()
    return (await apps.listDeploymentForAllNamespaces({}, requestOptions()))
      .items
  })

export const listStatefulSets = (): Promise<V1StatefulSet[]> =>
  cached("k8s:statefulsets", ttl(), async () => {
    const { apps } = getKubernetes()
    return (await apps.listStatefulSetForAllNamespaces({}, requestOptions()))
      .items
  })

export const listDaemonSets = (): Promise<V1DaemonSet[]> =>
  cached("k8s:daemonsets", ttl(), async () => {
    const { apps } = getKubernetes()
    return (await apps.listDaemonSetForAllNamespaces({}, requestOptions()))
      .items
  })

export const listIngresses = (): Promise<V1Ingress[]> =>
  cached("k8s:ingresses", ttl() * 4, async () => {
    const { networking } = getKubernetes()
    return (await networking.listIngressForAllNamespaces({}, requestOptions()))
      .items
  })

export const listWarningEvents = (): Promise<CoreV1Event[]> =>
  cached("k8s:events:warning", ttl(), async () => {
    const { core } = getKubernetes()
    const list = await core.listEventForAllNamespaces(
      { fieldSelector: "type=Warning", limit: 500 },
      requestOptions()
    )
    return list.items
  })

/** Kubernetes version, e.g. `v1.34.1`; `null` if it cannot be read. */
export const getServerVersion = (): Promise<string | null> =>
  cached("k8s:version", 5 * 60_000, async () => {
    try {
      const { version } = getKubernetes()
      return (await version.getCode(requestOptions())).gitVersion
    } catch (error) {
      logger.throttled("k8s-version", "warn", "Could not read server version", {
        error,
      })
      return null
    }
  })

/* -------------------------------------------------------------------------- */
/* metrics.k8s.io (metrics-server)                                            */
/* -------------------------------------------------------------------------- */

const UsageSchema = z.object({
  cpu: z.string().default("0"),
  memory: z.string().default("0"),
})

const NodeMetricsListSchema = z.object({
  items: z.array(
    z.object({
      metadata: z.object({ name: z.string() }),
      usage: UsageSchema,
    })
  ),
})

const PodMetricsListSchema = z.object({
  items: z.array(
    z.object({
      metadata: z.object({ name: z.string(), namespace: z.string() }),
      containers: z
        .array(z.object({ name: z.string(), usage: UsageSchema }))
        .default([]),
    })
  ),
})

export type NodeMetrics = z.infer<typeof NodeMetricsListSchema>["items"]
export type PodMetrics = z.infer<typeof PodMetricsListSchema>["items"]

/**
 * Reads from the metrics API. Returns `null` when metrics-server is missing
 * or unavailable so the dashboard degrades gracefully instead of failing.
 */
async function readMetrics<T extends z.ZodType>(
  plural: "nodes" | "pods",
  schema: T
): Promise<z.infer<T> | null> {
  try {
    const { custom } = getKubernetes()
    const body: unknown = await custom.listClusterCustomObject(
      { group: "metrics.k8s.io", version: "v1beta1", plural },
      requestOptions()
    )
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      logger.throttled(
        `metrics-${plural}-shape`,
        "warn",
        "Unexpected metrics API response",
        { plural }
      )
      return null
    }
    return parsed.data
  } catch (error) {
    logger.throttled(
      `metrics-${plural}`,
      "warn",
      "Metrics API unavailable; is metrics-server installed?",
      {
        plural,
        status: apiStatusCode(error),
        error,
      }
    )
    return null
  }
}

export const listNodeMetrics = (): Promise<NodeMetrics | null> =>
  cached("k8s:metrics:nodes", ttl(), async () => {
    const list = await readMetrics("nodes", NodeMetricsListSchema)
    return list?.items ?? null
  })

export const listPodMetrics = (): Promise<PodMetrics | null> =>
  cached("k8s:metrics:pods", ttl(), async () => {
    const list = await readMetrics("pods", PodMetricsListSchema)
    return list?.items ?? null
  })
