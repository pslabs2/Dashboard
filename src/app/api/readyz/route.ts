import { connection } from "next/server"

import { getDashboardConfig } from "@/server/config"
import { getEnv } from "@/server/env"
import { logger } from "@/server/log"

/**
 * Readiness: environment and dashboard config are valid. Kubernetes API
 * availability is deliberately not checked, so a control-plane blip does not
 * pull the dashboard (which reports that outage) out of rotation.
 */
export async function GET() {
  await connection()
  const headers = { "Cache-Control": "no-store" }
  try {
    getEnv()
    await getDashboardConfig()
    return Response.json({ status: "ready" }, { headers })
  } catch (error) {
    logger.throttled("readyz", "error", "Readiness check failed", { error })
    return Response.json({ status: "not-ready" }, { status: 503, headers })
  }
}
