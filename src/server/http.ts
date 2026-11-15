import "server-only"
import { connection } from "next/server"
import type { ErrorBody } from "@/lib/schemas"
import { DashboardError, toDashboardError } from "@/server/errors"
import { logger } from "@/server/log"
const NO_STORE = { "Cache-Control": "no-store" } as const
export function jsonError(error: DashboardError) {
  const body: ErrorBody = {
    error: { code: error.code, message: error.message },
  }
  return Response.json(body, { status: error.status, headers: NO_STORE })
}
/**
 * Runs a Route Handler body with consistent JSON responses: data is returned
 * uncached, and failures are logged server-side and mapped to a safe error.
 * `action` describes the operation for error messages, e.g. "list pods".
 */
export async function handle<T>(action: string, load: () => Promise<T>) {
  // Opt out of prerendering; must be outside the try block.
  await connection()
  try {
    return Response.json(await load(), { headers: NO_STORE })
  } catch (error) {
    const dashboardError = toDashboardError(error, action)
    logger.throttled(
      `api:${action}:${dashboardError.code}`,
      dashboardError.status >= 500 ? "error" : "warn",
      `Failed to ${action}`,
      { code: dashboardError.code, error: dashboardError.cause ?? error },
      15_000
    )
    return jsonError(dashboardError)
  }
}