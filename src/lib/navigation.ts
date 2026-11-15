import {
  Boxes,
  GitBranch,
  LayoutGrid,
  Server,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: "/" | "/cluster" | "/workloads" | "/gitops"
  title: string
  description: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    title: "Home",
    description: "Applications and status",
    icon: LayoutGrid,
  },
  {
    href: "/cluster",
    title: "Cluster",
    description: "Nodes, capacity and events",
    icon: Server,
  },
  {
    href: "/workloads",
    title: "Workloads",
    description: "Pods across namespaces",
    icon: Boxes,
  },
  {
    href: "/gitops",
    title: "GitOps",
    description: "Argo CD applications",
    icon: GitBranch,
  },
]

export function isActive(pathname: string, href: NavItem["href"]) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}
