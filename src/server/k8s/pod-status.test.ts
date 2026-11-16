import type { V1Pod } from "@kubernetes/client-node"
import { describe, expect, it } from "vitest"

import { describePod } from "@/server/k8s/pod-status"

const running = { running: { startedAt: new Date() } }

function pod(status: V1Pod["status"], spec?: Partial<V1Pod["spec"]>): V1Pod {
  return {
    metadata: { name: "p" },
    spec: { containers: [{ name: "app" }], ...spec },
    status,
  }
}

describe("describePod", () => {
  it("reports a ready running pod as ok", () => {
    expect(
      describePod(
        pod({
          phase: "Running",
          containerStatuses: [
            {
              name: "app",
              image: "x",
              imageID: "",
              ready: true,
              restartCount: 2,
              state: running,
            },
          ],
        })
      )
    ).toEqual({
      status: "Running",
      severity: "ok",
      readyContainers: 1,
      totalContainers: 1,
      restarts: 2,
    })
  })

  it("surfaces CrashLoopBackOff as an error", () => {
    const info = describePod(
      pod({
        phase: "Running",
        containerStatuses: [
          {
            name: "app",
            image: "x",
            imageID: "",
            ready: false,
            restartCount: 5,
            state: { waiting: { reason: "CrashLoopBackOff" } },
          },
        ],
      })
    )
    expect(info.status).toBe("CrashLoopBackOff")
    expect(info.severity).toBe("error")
  })

  it("reports init container progress and skips started sidecars", () => {
    const initContainers = [
      { name: "sidecar", restartPolicy: "Always" },
      { name: "migrate" },
    ]
    const info = describePod(
      pod(
        {
          phase: "Pending",
          initContainerStatuses: [
            {
              name: "sidecar",
              image: "x",
              imageID: "",
              ready: true,
              restartCount: 0,
              started: true,
              state: running,
            },
            {
              name: "migrate",
              image: "x",
              imageID: "",
              ready: false,
              restartCount: 0,
              state: { waiting: { reason: "PodInitializing" } },
            },
          ],
        },
        { initContainers }
      )
    )
    expect(info.status).toBe("Init:1/2")
    expect(info.severity).toBe("warning")
  })

  it("marks terminating and completed pods", () => {
    const terminating = pod({ phase: "Running" })
    terminating.metadata!.deletionTimestamp = new Date()
    expect(describePod(terminating).status).toBe("Terminating")
    expect(describePod(pod({ phase: "Succeeded" })).severity).toBe("ok")
  })
})
