import "server-only"

import { ApiException } from "@kubernetes/client-node"

import { ConfigError } from "@/server/config"

export type ErrorCode =
  | "BAD_REQUEST"
  | "CONFIG_INVALID"
  | "K8S_UNREACHABLE"
  | "K8S_TIMEOUT"
  | "K8S_UNAUTHORIZED"
  | "K8S_FORBIDDEN"
  | "K8S_NOT_FOUND"
  | "K8S_ERROR"
  | "INTERNAL"

/** An error whose message is safe to show to dashboard users. */
export class DashboardError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "DashboardError"
  }
}

const NETWORK_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
])

function errorCode(error: unknown): string | undefined {
  let current: unknown = error
  for (let depth = 0; current && depth < 4; depth += 1) {
    const code = (current as { code?: unknown }).code
    if (typeof code === "string") return code
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}

export function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  )
}

/**
 * Maps any thrown value to a `DashboardError` with a user-facing message.
 * Raw upstream errors are never sent to the browser; they are logged instead.
 * `action` describes the failed operation, e.g. "list nodes".
 */
export function toDashboardError(error: unknown, action: string) {
  if (error instanceof DashboardError) return error

  if (error instanceof ConfigError) {
    return new DashboardError("CONFIG_INVALID", error.message, 500, {
      cause: error,
    })
  }

  if (error instanceof ApiException) {
    switch (error.code) {
      case 401:
        return new DashboardError(
          "K8S_UNAUTHORIZED",
          "The Kubernetes API rejected the dashboard's credentials.",
          502,
          { cause: error }
        )
      case 403:
        return new DashboardError(
          "K8S_FORBIDDEN",
          `The dashboard's service account is not allowed to ${action}. Check its RBAC permissions.`,
          502,
          { cause: error }
        )
      case 404:
        return new DashboardError(
          "K8S_NOT_FOUND",
          `Kubernetes resource not found while trying to ${action}.`,
          502,
          { cause: error }
        )
      default:
        return new DashboardError(
          "K8S_ERROR",
          `The Kubernetes API returned an error (HTTP ${error.code}) while trying to ${action}.`,
          502,
          { cause: error }
        )
    }
  }

  if (isTimeoutError(error)) {
    return new DashboardError(
      "K8S_TIMEOUT",
      `Timed out waiting for the Kubernetes API to ${action}.`,
      504,
      { cause: error }
    )
  }

  const code = errorCode(error)
  if (
    (code && NETWORK_ERROR_CODES.has(code)) ||
    (error instanceof TypeError && error.message === "fetch failed")
  ) {
    return new DashboardError(
      "K8S_UNREACHABLE",
      "Cannot reach the Kubernetes API server.",
      503,
      { cause: error }
    )
  }

  return new DashboardError("INTERNAL", "Unexpected server error.", 500, {
    cause: error,
  })
}

export function apiStatusCode(error: unknown) {
  return error instanceof ApiException ? error.code : undefined
}
