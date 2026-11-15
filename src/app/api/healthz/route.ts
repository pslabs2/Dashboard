import { connection } from "next/server"

/** Liveness: the process is serving requests. Never touches Kubernetes. */
export async function GET() {
  await connection()
  return Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } }
  )
}
