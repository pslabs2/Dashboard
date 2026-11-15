import "server-only"

import {
  AppsV1Api,
  CoreV1Api,
  CustomObjectsApi,
  KubeConfig,
  NetworkingV1Api,
  Observable,
  VersionApi,
  type ConfigurationOptions,
  type ObservableMiddleware,
} from "@kubernetes/client-node"

import { getEnv } from "@/server/env"
import { logger } from "@/server/log"

export interface KubernetesClients {
  config: KubeConfig
  core: CoreV1Api
  apps: AppsV1Api
  networking: NetworkingV1Api
  custom: CustomObjectsApi
  version: VersionApi
}

const STORE_KEY = Symbol.for("homelab-dashboard.k8s")
const globalStore = globalThis as unknown as Record<
  symbol,
  KubernetesClients | undefined
>

/**
 * Lazily creates the API clients. `loadFromDefault()` uses the in-cluster
 * ServiceAccount when running in a Pod and `$KUBECONFIG` / `~/.kube/config`
 * during local development.
 */
export function getKubernetes(): KubernetesClients {
  const existing = globalStore[STORE_KEY]
  if (existing) return existing

  const config = new KubeConfig()
  config.loadFromDefault()
  logger.info("Kubernetes client configured", {
    context: config.getCurrentContext(),
    server: config.getCurrentCluster()?.server,
  })

  const clients: KubernetesClients = {
    config,
    core: config.makeApiClient(CoreV1Api),
    apps: config.makeApiClient(AppsV1Api),
    networking: config.makeApiClient(NetworkingV1Api),
    custom: config.makeApiClient(CustomObjectsApi),
    version: config.makeApiClient(VersionApi),
  }
  globalStore[STORE_KEY] = clients
  return clients
}

function timeoutMiddleware(timeoutMs: number): ObservableMiddleware {
  return {
    pre(context) {
      context.setSignal(AbortSignal.timeout(timeoutMs))
      return new Observable(Promise.resolve(context))
    },
    post(context) {
      return new Observable(Promise.resolve(context))
    },
  }
}

/** Per-request options that abort calls exceeding `K8S_REQUEST_TIMEOUT_MS`. */
export function requestOptions(): ConfigurationOptions<ObservableMiddleware> {
  return {
    middleware: [timeoutMiddleware(getEnv().K8S_REQUEST_TIMEOUT_MS)],
    middlewareMergeStrategy: "append",
  }
}
