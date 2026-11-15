import "server-only"

import type { ArgoResponse } from "@/lib/schemas"
import { cached } from "@/server/cache"
import { getDashboardConfig } from "@/server/config"
import { getEnv } from "@/server/env"
import { apiStatusCode } from "@/server/errors"
import {
  normalizeUiUrl,
  parseApplicationList,
  summarizeApplications,
} from "@/server/k8s/argocd-model"
import { getKubernetes, requestOptions } from "@/server/k8s/client"
import { logger } from "@/server/log"

const APPLICATIONS = {
  group: "argoproj.io",
  version: "v1alpha1",
  plural: "applications",
} as const

/**
 * Reads Argo CD Applications straight from the Kubernetes API. This needs only
 * read RBAC on `applications.argoproj.io` and no Argo CD API token.
 */
export async function getArgoApplications(): Promise<ArgoResponse> {
  const config = await getDashboardConfig()
  const uiUrl = normalizeUiUrl(config.argocd.url)
  const namespace = config.argocd.namespace

  const body = await cached(
    `k8s:argocd:${namespace ?? "*"}`,
    getEnv().K8S_CACHE_TTL_MS,
    async (): Promise<unknown> => {
      const { custom } = getKubernetes()
      try {
        return namespace
          ? await custom.listNamespacedCustomObject(
              { ...APPLICATIONS, namespace },
              requestOptions()
            )
          : await custom.listClusterCustomObject(APPLICATIONS, requestOptions())
      } catch (error) {
        // 404: the Application CRD is not installed.
        if (apiStatusCode(error) === 404) return null
        throw error
      }
    }
  )

  const { applications, skipped } = parseApplicationList(body, uiUrl)
  if (skipped > 0) {
    logger.throttled(
      "argocd-skipped",
      "warn",
      "Skipped malformed Argo CD Applications",
      { skipped }
    )
  }

  return {
    generatedAt: new Date().toISOString(),
    installed: body !== null,
    uiUrl,
    summary: summarizeApplications(applications),
    applications,
  }
}
