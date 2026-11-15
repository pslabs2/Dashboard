import { handle } from "@/server/http"
import { getNodes } from "@/server/k8s/cluster"
export function GET() {
  return handle("list nodes", getNodes)
}