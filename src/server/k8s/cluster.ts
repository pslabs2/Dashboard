import "server-only"

import type {
  CoreV1Event,
  V1Container,
  V1Node,
  V1Pod,
} from "@kubernetes/client-node"

import { parseQuantity, sumQuantities } from "@/lib/quantity"
import type {
  ClusterEvent,
  ClusterOverview,
  EventsResponse,
  NodeSummary,
  NodesResponse,
  PodSummary,
  PodsResponse,
  ResourceStat,
} from "@/lib/schemas"
import { toIso } from "@/server/k8s/dates"
import { describePod } from "@/server/k8s/pod-status"
import {
  getServerVersion,
  listDaemonSets,
  listDeployments,
  listNamespaces,
  listNodeMetrics,
  listNodes,
  listPodMetrics,
  listPods,
  listStatefulSets,
  listWarningEvents,
} from "@/server/k8s/resources"

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const finite = (value: number) => (Number.isFinite(value) ? value : 0)

function isTerminated(pod: V1Pod) {
  const phase = pod.status?.phase
  return phase === "Succeeded" || phase === "Failed"
}

function containerRequest(container: V1Container, resource: "cpu" | "memory") {
  return finite(parseQuantity(container.resources?.requests?.[resource]))
}

/**
 * Effective pod request, as computed by the scheduler: app containers plus
 * restartable (sidecar) init containers run concurrently, while regular init
 * containers run one at a time before them.
 */
export function podRequest(pod: V1Pod, resource: "cpu" | "memory") {
  const spec = pod.spec
  if (!spec) return 0

  let sidecars = 0
  let initPeak = 0
  for (const init of spec.initContainers ?? []) {
    const request = containerRequest(init, resource)
    if (init.restartPolicy === "Always") sidecars += request
    else initPeak = Math.max(initPeak, sidecars + request)
  }

  const running = spec.containers.reduce(
    (sum, container) => sum + containerRequest(container, resource),
    sidecars
  )
  const overhead = finite(parseQuantity(spec.overhead?.[resource]))
  return Math.max(running, initPeak) + overhead
}

function isNodeReady(node: V1Node) {
  return (
    node.status?.conditions?.some(
      (c) => c.type === "Ready" && c.status === "True"
    ) ?? false
  )
}

function nodeRoles(node: V1Node) {
  const labels = node.metadata?.labels ?? {}
  const roles = new Set<string>()
  for (const key of Object.keys(labels)) {
    if (key.startsWith("node-role.kubernetes.io/")) {
      const role = key.slice("node-role.kubernetes.io/".length)
      if (role) roles.add(role)
    }
  }
  const legacy = labels["kubernetes.io/role"]
  if (legacy) roles.add(legacy)
  return [...roles].sort()
}

function nodeProblems(node: V1Node) {
  return (node.status?.conditions ?? [])
    .filter((c) =>
      c.type === "Ready" ? c.status !== "True" : c.status === "True"
    )
    .map((c) => ({
      type: c.type,
      status: c.status,
      reason: c.reason ?? null,
      message: c.message ?? null,
    }))
}

function sumUsage(
  items: { usage: { cpu: string; memory: string } }[] | null,
  resource: "cpu" | "memory"
) {
  if (!items) return null
  return sumQuantities(items.map((item) => item.usage[resource]))
}

function readyCount<T>(items: T[], isReady: (item: T) => boolean) {
  return { ready: items.filter(isReady).length, total: items.length }
}

const podKey = (namespace: string | undefined, name: string | undefined) =>
  `${namespace ?? ""}/${name ?? ""}`

/* -------------------------------------------------------------------------- */
/* Overview                                                                   */
/* -------------------------------------------------------------------------- */

export async function getClusterOverview(): Promise<ClusterOverview> {
  const [
    nodes,
    pods,
    namespaces,
    deployments,
    statefulSets,
    daemonSets,
    nodeMetrics,
    version,
  ] = await Promise.all([
    listNodes(),
    listPods(),
    listNamespaces(),
    listDeployments(),
    listStatefulSets(),
    listDaemonSets(),
    listNodeMetrics(),
    getServerVersion(),
  ])

  const podCounts = {
    total: pods.length,
    running: 0,
    pending: 0,
    succeeded: 0,
    failed: 0,
    unknown: 0,
    unhealthy: 0,
  }
  for (const pod of pods) {
    switch (pod.status?.phase) {
      case "Running":
        podCounts.running += 1
        break
      case "Pending":
        podCounts.pending += 1
        break
      case "Succeeded":
        podCounts.succeeded += 1
        break
      case "Failed":
        podCounts.failed += 1
        break
      default:
        podCounts.unknown += 1
    }
    if (describePod(pod).severity !== "ok") podCounts.unhealthy += 1
  }

  const activePods = pods.filter((pod) => !isTerminated(pod))
  const resourceStat = (resource: "cpu" | "memory"): ResourceStat => ({
    used: sumUsage(nodeMetrics, resource),
    requested: activePods.reduce(
      (sum, pod) => sum + podRequest(pod, resource),
      0
    ),
    allocatable: sumQuantities(
      nodes.map((node) => node.status?.allocatable?.[resource])
    ),
  })

  return {
    generatedAt: new Date().toISOString(),
    version,
    metricsAvailable: nodeMetrics !== null,
    nodes: readyCount(nodes, isNodeReady),
    pods: podCounts,
    namespaces: namespaces.length,
    workloads: {
      deployments: readyCount(
        deployments,
        (d) => (d.status?.readyReplicas ?? 0) >= (d.spec?.replicas ?? 1)
      ),
      statefulSets: readyCount(
        statefulSets,
        (s) => (s.status?.readyReplicas ?? 0) >= (s.spec?.replicas ?? 1)
      ),
      daemonSets: readyCount(
        daemonSets,
        (d) =>
          (d.status?.numberReady ?? 0) >=
          (d.status?.desiredNumberScheduled ?? 0)
      ),
    },
    cpu: resourceStat("cpu"),
    memory: resourceStat("memory"),
  }
}

/* -------------------------------------------------------------------------- */
/* Nodes                                                                      */
/* -------------------------------------------------------------------------- */

export async function getNodes(): Promise<NodesResponse> {
  const [nodes, pods, nodeMetrics] = await Promise.all([
    listNodes(),
    listPods(),
    listNodeMetrics(),
  ])

  const podsByNode = new Map<string, V1Pod[]>()
  for (const pod of pods) {
    const nodeName = pod.spec?.nodeName
    if (!nodeName || isTerminated(pod)) continue
    const list = podsByNode.get(nodeName) ?? []
    list.push(pod)
    podsByNode.set(nodeName, list)
  }
  const usageByNode = new Map(
    (nodeMetrics ?? []).map((m) => [m.metadata.name, m.usage])
  )

  const summaries = nodes.map((node): NodeSummary => {
    const name = node.metadata?.name ?? ""
    const nodePods = podsByNode.get(name) ?? []
    const usage = usageByNode.get(name)
    const allocatable = node.status?.allocatable ?? {}
    const info = node.status?.nodeInfo

    const stat = (resource: "cpu" | "memory"): ResourceStat => ({
      used: usage ? finite(parseQuantity(usage[resource])) : null,
      requested: nodePods.reduce(
        (sum, pod) => sum + podRequest(pod, resource),
        0
      ),
      allocatable: finite(parseQuantity(allocatable[resource])),
    })

    return {
      name,
      ready: isNodeReady(node),
      schedulable: !node.spec?.unschedulable,
      roles: nodeRoles(node),
      kubeletVersion: info?.kubeletVersion ?? null,
      osImage: info?.osImage ?? null,
      kernelVersion: info?.kernelVersion ?? null,
      containerRuntime: info?.containerRuntimeVersion ?? null,
      architecture: info?.architecture ?? null,
      internalIP:
        node.status?.addresses?.find((a) => a.type === "InternalIP")?.address ??
        null,
      createdAt: toIso(node.metadata?.creationTimestamp),
      problems: nodeProblems(node),
      pods: {
        running: nodePods.length,
        capacity: Math.round(finite(parseQuantity(allocatable.pods))),
      },
      cpu: stat("cpu"),
      memory: stat("memory"),
    }
  })

  summaries.sort((a, b) => a.name.localeCompare(b.name))

  return {
    generatedAt: new Date().toISOString(),
    metricsAvailable: nodeMetrics !== null,
    nodes: summaries,
  }
}

/* -------------------------------------------------------------------------- */
/* Pods                                                                       */
/* -------------------------------------------------------------------------- */

export async function getPods(): Promise<PodsResponse> {
  const [pods, podMetrics] = await Promise.all([listPods(), listPodMetrics()])

  const usageByPod = new Map(
    (podMetrics ?? []).map((m) => [
      podKey(m.metadata.namespace, m.metadata.name),
      {
        cpu: sumQuantities(m.containers.map((c) => c.usage.cpu)),
        memory: sumQuantities(m.containers.map((c) => c.usage.memory)),
      },
    ])
  )

  const namespaces = new Set<string>()
  const summaries = pods.map((pod): PodSummary => {
    const namespace = pod.metadata?.namespace ?? "default"
    const name = pod.metadata?.name ?? ""
    namespaces.add(namespace)
    const usage = usageByPod.get(podKey(namespace, name))
    const owner =
      pod.metadata?.ownerReferences?.find((ref) => ref.controller) ??
      pod.metadata?.ownerReferences?.[0]

    return {
      name,
      namespace,
      phase: pod.status?.phase ?? "Unknown",
      ...describePod(pod),
      node: pod.spec?.nodeName ?? null,
      ownerKind: owner?.kind ?? null,
      createdAt: toIso(pod.metadata?.creationTimestamp),
      cpuCores: usage?.cpu ?? null,
      memoryBytes: usage?.memory ?? null,
    }
  })

  summaries.sort(
    (a, b) =>
      a.namespace.localeCompare(b.namespace) || a.name.localeCompare(b.name)
  )

  return {
    generatedAt: new Date().toISOString(),
    metricsAvailable: podMetrics !== null,
    namespaces: [...namespaces].sort(),
    pods: summaries,
  }
}

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

function eventTime(event: CoreV1Event) {
  return toIso(
    event.series?.lastObservedTime ??
      event.lastTimestamp ??
      event.eventTime ??
      event.firstTimestamp ??
      event.metadata.creationTimestamp
  )
}

export async function getWarningEvents(limit = 50): Promise<EventsResponse> {
  const events = await listWarningEvents()

  const summaries = events.map((event): ClusterEvent => ({
    id:
      event.metadata.uid ??
      `${event.metadata.namespace ?? ""}/${event.metadata.name ?? ""}`,
    type: event.type ?? "Warning",
    reason: event.reason ?? null,
    message: event.message ?? null,
    namespace: event.metadata.namespace ?? null,
    object: {
      kind: event.involvedObject.kind ?? null,
      name: event.involvedObject.name ?? null,
    },
    count: Math.max(1, event.series?.count ?? event.count ?? 1),
    lastSeen: eventTime(event),
  }))

  summaries.sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""))

  return {
    generatedAt: new Date().toISOString(),
    events: summaries.slice(0, limit),
  }
}

/** Cluster-wide CPU (cores) and memory (bytes) usage and capacity. */
export async function getClusterUsage() {
  const [nodes, nodeMetrics] = await Promise.all([
    listNodes(),
    listNodeMetrics(),
  ])
  return {
    capacity: {
      cpuCores: sumQuantities(nodes.map((n) => n.status?.allocatable?.cpu)),
      memoryBytes: sumQuantities(
        nodes.map((n) => n.status?.allocatable?.memory)
      ),
    },
    usage: nodeMetrics
      ? {
          cpuCores: sumUsage(nodeMetrics, "cpu") ?? 0,
          memoryBytes: sumUsage(nodeMetrics, "memory") ?? 0,
        }
      : null,
  }
}
