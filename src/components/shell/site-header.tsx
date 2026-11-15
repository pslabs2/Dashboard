"use client"

import { usePathname } from "next/navigation"

import { CommandMenu } from "@/components/shell/command-menu"
import { LiveIndicator } from "@/components/shell/live-indicator"
import { ThemeToggle } from "@/components/shell/theme-toggle"
import { ViewerMenu } from "@/components/shell/viewer-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { isActive, NAV_ITEMS } from "@/lib/navigation"
import type { Viewer } from "@/server/auth"

export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname()
  const current = NAV_ITEMS.find((item) => isActive(pathname, item.href))

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-4 md:rounded-t-xl">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-1 data-[orientation=vertical]:h-4"
      />
      <h1 className="truncate text-sm font-medium">
        {current?.title ?? "Dashboard"}
      </h1>
      <div className="ml-auto flex items-center gap-2">
        <LiveIndicator />
        <CommandMenu />
        <ThemeToggle />
        {viewer && <ViewerMenu viewer={viewer} />}
      </div>
    </header>
  )
}
