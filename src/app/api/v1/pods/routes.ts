import { handle } from "@/server/http"
import { getPods } from "@/server/k8s/cluster"
export function GET() {
  return handle("list pods", getPods)
}