import { getAppStatuses } from "@/server/apps"
import { handle } from "@/server/http"
export function GET() {
  return handle("check application status", getAppStatuses)
}