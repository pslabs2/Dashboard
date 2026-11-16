import { describe, expect, it } from "vitest"

import {
  parseApplicationList,
  summarizeApplications,
} from "@/server/k8s/argocd-model"

const app = (name: string, sync: string, health: string, extra = {}) => ({
  metadata: { name, namespace: "argocd" },
  spec: {
    project: "homelab",
    source: { repoURL: "https://github.com/x/y", path: name },
    syncPolicy: { automated: {} },
    destination: { server: "https://kubernetes.default.svc", namespace: name },
  },
  status: {
    sync: { status: sync, revision: "a".repeat(40) },
    health: { status: health },
    reconciledAt: "2026-01-01T00:00:00Z",
  },
  ...extra,
})

describe("parseApplicationList", () => {
  it("normalizes, sorts and skips malformed items", () => {
    const { applications, skipped } = parseApplicationList(
      {
        items: [
          app("zeta", "Synced", "Healthy"),
          app("alpha", "OutOfSync", "Degraded"),
          { metadata: {} },
          "nonsense",
        ],
      },
      "https://argocd.example.com"
    )
    expect(skipped).toBe(2)
    expect(applications.map((a) => a.name)).toEqual(["alpha", "zeta"])
    expect(applications[0]).toMatchObject({
      project: "homelab",
      syncStatus: "OutOfSync",
      healthStatus: "Degraded",
      autoSync: true,
      source: { path: "alpha", count: 1 },
      destination: { namespace: "alpha" },
      reconciledAt: "2026-01-01T00:00:00.000Z",
      url: "https://argocd.example.com/applications/argocd/alpha",
    })
  })

  it("tolerates unknown statuses and missing fields", () => {
    const { applications } = parseApplicationList(
      {
        items: [
          {
            metadata: { name: "bare" },
            spec: { syncPolicy: { automated: { enabled: false } } },
            status: { sync: { status: "Weird" }, health: 42 },
          },
        ],
      },
      null
    )
    expect(applications[0]).toMatchObject({
      namespace: "argocd",
      project: "default",
      syncStatus: "Unknown",
      healthStatus: "Unknown",
      autoSync: false,
      url: null,
    })
  })

  it("handles a missing CRD (null body)", () => {
    expect(parseApplicationList(null, null)).toEqual({
      applications: [],
      skipped: 0,
    })
  })
})

describe("summarizeApplications", () => {
  it("counts sync and health states", () => {
    const { applications } = parseApplicationList(
      {
        items: [
          app("a", "Synced", "Healthy"),
          app("b", "OutOfSync", "Progressing"),
          app("c", "Synced", "Missing"),
        ],
      },
      null
    )
    expect(summarizeApplications(applications)).toEqual({
      total: 3,
      synced: 2,
      outOfSync: 1,
      healthy: 1,
      progressing: 1,
      degraded: 1,
    })
  })
})
