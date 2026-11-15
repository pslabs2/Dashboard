import { handle } from "@/server/http"
import { getWarningEvents } from "@/server/k8s/cluster"
export function GET() {
  return handle("list events", () => getWarningEvents())
}