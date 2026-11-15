import type { V1Pod } from "@kubernetes/client-node"

import type { Severity } from "@/lib/schemas"

const ERROR_REASONS = new Set([
  "CrashLoopBackOff",
  "ImagePullBackOff",
  "ErrImagePull",
  "ErrImageNeverPull",
  "InvalidImageName",
  "CreateContainerConfigError",
  "CreateContainerError",
  "RunContainerError",
  "ContainerCannotRun",
  "OOMKilled",
  "Error",
  "DeadlineExceeded",
  "Evicted",
])

export interface PodStatusInfo {
  status: string
  severity: Severity
  readyContainers: number
  totalContainers: number
  restarts: number
}

function terminatedLabel(
  state: { reason?: string; signal?: number; exitCode: number },
  prefix = ""
) {
  if (state.reason) return `${prefix}${state.reason}`
  if (state.signal) return `${prefix}Signal:${state.signal}`
  return `${prefix}ExitCode:${state.exitCode}`
}

/**
 * Derives the kubectl-style STATUS column and a coarse severity for a Pod.
 * Simplified port of `printPod` in kubernetes/pkg/printers/internalversion.
 */
export function describePod(pod: V1Pod): PodStatusInfo {
  const phase = pod.status?.phase ?? "Unknown"
  const containerStatuses = pod.status?.containerStatuses ?? []
  const initStatuses = pod.status?.initContainerStatuses ?? []
  const initSpecs = pod.spec?.initContainers ?? []

  const totalContainers =
    pod.spec?.containers.length ?? containerStatuses.length
  const readyContainers = containerStatuses.filter((c) => c.ready).length
  const restarts = containerStatuses.reduce(
    (sum, c) => sum + (c.restartCount ?? 0),
    0
  )

  let status = pod.status?.reason ?? phase
  let initializing = false

  for (const [index, container] of initStatuses.entries()) {
    const terminated = container.state?.terminated
    const waiting = container.state?.waiting
    const isSidecar = initSpecs[index]?.restartPolicy === "Always"

    if (terminated?.exitCode === 0) continue
    if (isSidecar && container.started) continue

    initializing = true
    if (terminated) status = terminatedLabel(terminated, "Init:")
    else if (waiting?.reason && waiting.reason !== "PodInitializing")
      status = `Init:${waiting.reason}`
    else status = `Init:${index}/${initSpecs.length || initStatuses.length}`
    break
  }

  if (!initializing) {
    let hasRunning = false
    for (const container of [...containerStatuses].reverse()) {
      const { waiting, terminated, running } = container.state ?? {}
      if (waiting?.reason) status = waiting.reason
      else if (terminated) status = terminatedLabel(terminated)
      else if (running && container.ready) hasRunning = true
    }
    if (status === "Completed" && hasRunning) {
      const ready = pod.status?.conditions?.some(
        (c) => c.type === "Ready" && c.status === "True"
      )
      status = ready ? "Running" : "NotReady"
    }
  }

  if (pod.metadata?.deletionTimestamp) {
    status = pod.status?.reason === "NodeLost" ? "Unknown" : "Terminating"
  }

  const baseReason = status.startsWith("Init:") ? status.slice(5) : status
  let severity: Severity
  if (phase === "Succeeded" || status === "Completed") severity = "ok"
  else if (phase === "Failed" || ERROR_REASONS.has(baseReason))
    severity = "error"
  else if (
    phase === "Running" &&
    status === "Running" &&
    readyContainers === totalContainers
  )
    severity = "ok"
  else severity = "warning"

  return { status, severity, readyContainers, totalContainers, restarts }
}
