import type { V1Ingress } from "@kubernetes/client-node"
import { describe, expect, it } from "vitest"

import { discoverApps } from "@/server/k8s/ingress-discovery"

function ingress(
  annotations: Record<string, string>,
  spec: V1Ingress["spec"] = {
    rules: [{ host: "app.example.com" }],
  }
): V1Ingress {
  return {
    metadata: { name: "web", namespace: "apps", annotations },
    spec,
  }
}

describe("discoverApps", () => {
  it("only includes Ingresses that opt in", () => {
    const apps = discoverApps(
      [
        ingress({}),
        ingress({ "dashboard.homelab/enabled": "false" }),
        ingress({ "dashboard.homelab/enabled": " TRUE " }),
      ],
      "Discovered"
    )
    expect(apps).toHaveLength(1)
    expect(apps[0]).toMatchObject({
      name: "web",
      group: "Discovered",
      url: "http://app.example.com",
      healthCheck: true,
      ingress: "apps/web",
    })
  })

  it("derives https and a path from TLS hosts and rules", () => {
    const [app] = discoverApps(
      [
        ingress(
          { "dashboard.homelab/enabled": "true" },
          {
            tls: [{ hosts: ["app.example.com"] }],
            rules: [
              { host: "*.example.com" },
              {
                host: "app.example.com",
                http: {
                  paths: [
                    {
                      path: "/grafana",
                      pathType: "Prefix",
                      backend: { service: { name: "grafana" } },
                    },
                  ],
                },
              },
            ],
          }
        ),
      ],
      "Discovered"
    )
    expect(app?.url).toBe("https://app.example.com/grafana")
  })

  it("applies annotation overrides and ignores invalid URLs", () => {
    const [app] = discoverApps(
      [
        ingress({
          "dashboard.homelab/enabled": "true",
          "dashboard.homelab/name": "Grafana",
          "dashboard.homelab/group": "Monitoring",
          "dashboard.homelab/icon": "chart-line",
          "dashboard.homelab/url": "javascript:alert(1)",
          "dashboard.homelab/health-url":
            "http://grafana.monitoring.svc/api/health",
          "dashboard.homelab/health-check": "false",
        }),
      ],
      "Discovered"
    )
    expect(app).toMatchObject({
      name: "Grafana",
      group: "Monitoring",
      icon: "chart-line",
      url: "http://app.example.com",
      healthCheck: false,
      healthUrl: "http://grafana.monitoring.svc/api/health",
    })
  })

  it("skips Ingresses without a usable host", () => {
    expect(
      discoverApps(
        [
          ingress(
            { "dashboard.homelab/enabled": "true" },
            { rules: [{ host: "*.example.com" }] }
          ),
        ],
        "Discovered"
      )
    ).toEqual([])
  })
})
