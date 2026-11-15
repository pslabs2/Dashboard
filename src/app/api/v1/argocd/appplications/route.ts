import { handle } from "@/server/http"
import { getArgoApplications } from "@/server/k8s/argocd"
export function GET() {
  return handle("list Argo CD applications", getArgoApplications)
}