import type { V1Ingress } from "@kubernetes/client-node"

/** Annotation prefix used to opt Ingresses into the launcher. */
export const ANNOTATION_PREFIX = "dashboard.homelab/"

export interface DiscoveredApp {
  name: string
  url: string
  group: string
  description?: string
  icon?: string
  healthCheck: boolean
  healthUrl?: string
  /** `namespace/name` of the source Ingress. */
  ingress: string
}

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

const clean = (value: string | undefined, max: number) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, max) : undefined
}

function defaultUrl(ingress: V1Ingress) {
  const rule = ingress.spec?.rules?.find(
    (r) => r.host && !r.host.startsWith("*")
  )
  if (!rule?.host) return undefined

  const tlsHosts = new Set(ingress.spec?.tls?.flatMap((t) => t.hosts ?? []))
  const scheme = tlsHosts.has(rule.host) ? "https" : "http"
  const path = rule.http?.paths.find(
    (p) => p.pathType !== "ImplementationSpecific" && p.path
  )?.path
  const suffix = path && path !== "/" ? path : ""
  return `${scheme}://${rule.host}${suffix}`
}

/**
 * Turns Ingresses annotated with `dashboard.homelab/enabled: "true"` into
 * launcher entries. Supported annotations (all optional): `name`, `group`,
 * `description`, `icon`, `url`, `health-url`, `health-check` ("false" to
 * disable status probes).
 */
export function discoverApps(
  ingresses: V1Ingress[],
  defaultGroup: string
): DiscoveredApp[] {
  const apps: DiscoveredApp[] = []

  for (const ingress of ingresses) {
    const annotations = ingress.metadata?.annotations ?? {}
    const get = (key: string) => annotations[`${ANNOTATION_PREFIX}${key}`]
    if (get("enabled")?.trim().toLowerCase() !== "true") continue

    const override = get("url")?.trim()
    const url = isHttpUrl(override) ? override : defaultUrl(ingress)
    if (!url) continue

    const healthUrl = get("health-url")?.trim()
    const namespace = ingress.metadata?.namespace ?? "default"
    const ingressName = ingress.metadata?.name ?? "ingress"

    apps.push({
      name: clean(get("name"), 64) ?? ingressName,
      url,
      group: clean(get("group"), 64) ?? defaultGroup,
      description: clean(get("description"), 200),
      icon: clean(get("icon"), 2048),
      healthCheck: get("health-check")?.trim().toLowerCase() !== "false",
      healthUrl: isHttpUrl(healthUrl) ? healthUrl : undefined,
      ingress: `${namespace}/${ingressName}`,
    })
  }

  return apps
}
