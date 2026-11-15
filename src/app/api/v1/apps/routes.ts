import { getApps } from "@/server/apps"
import { handle } from "@/server/http"
export function GET() {
  return handle("load the application list", getApps)
}