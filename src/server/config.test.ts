import { describe, expect, it } from "vitest"

import { ConfigError, parseDashboardConfig } from "@/server/config"

describe("parseDashboardConfig", () => {
  it("returns defaults for an empty file", () => {
    const config = parseDashboardConfig("")
    expect(config.title).toBe("Homelab")
    expect(config.groups).toEqual([])
    expect(config.argocd).toEqual({})
    expect(config.discovery.ingress).toEqual({
      enabled: false,
      defaultGroup: "Discovered",
    })
  })

  it("parses groups and defaults healthCheck to true", () => {
    const config = parseDashboardConfig(`
title: Lab
groups:
  - name: Media
    apps:
      - name: Jellyfin
        url: https://jellyfin.example.com
      - name: Sonarr
        url: https://sonarr.example.com
        healthCheck:
          url: http://sonarr.media.svc:8989/ping
      - name: Router
        url: http://192.168.1.1
        healthCheck: false
`)
    const apps = config.groups[0]?.apps ?? []
    expect(apps.map((a) => a.healthCheck)).toEqual([
      true,
      { url: "http://sonarr.media.svc:8989/ping" },
      false,
    ])
  })

  it("rejects non-http URLs and unknown keys", () => {
    expect(() =>
      parseDashboardConfig(
        "groups: [{ name: A, apps: [{ name: x, url: 'javascript:alert(1)' }] }]"
      )
    ).toThrow(ConfigError)
    expect(() => parseDashboardConfig("titel: typo")).toThrow(ConfigError)
  })

  it("reports invalid YAML as a ConfigError", () => {
    expect(() => parseDashboardConfig("groups: [")).toThrow(/not valid YAML/)
  })
})
