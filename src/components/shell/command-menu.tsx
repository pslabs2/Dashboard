"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ExternalLink, Monitor, Moon, Search, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { AppIcon } from "@/components/dashboard/app-icon"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { queries } from "@/lib/api/queries"
import { NAV_ITEMS } from "@/lib/navigation"

/** ⌘K / Ctrl+K palette for pages, applications and theme switching. */
export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme } = useTheme()
  const { data } = useQuery(queries.apps())

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const run = (action: () => void) => {
    setOpen(false)
    action()
  }

  const apps = data?.groups.flatMap((group) => group.apps) ?? []

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 text-muted-foreground sm:w-56 sm:justify-between"
        onClick={() => setOpen(true)}
        aria-label="Search applications and pages"
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" aria-hidden />
          <span className="hidden sm:inline">Search…</span>
        </span>
        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Jump to a page or open an application"
      >
        <CommandInput placeholder="Search applications and pages…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {apps.length > 0 && (
            <CommandGroup heading="Applications">
              {apps.map((app) => (
                <CommandItem
                  key={app.id}
                  value={`${app.name} ${app.group} ${app.description ?? ""}`}
                  onSelect={() =>
                    run(() =>
                      window.open(app.url, "_blank", "noopener,noreferrer")
                    )
                  }
                >
                  <AppIcon icon={app.icon} name={app.name} className="size-4" />
                  <span>{app.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {app.group}
                  </span>
                  <ExternalLink
                    className="ml-auto size-3.5 opacity-60"
                    aria-hidden
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup heading="Pages">
            {NAV_ITEMS.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.description}`}
                onSelect={() => run(() => router.push(item.href))}
              >
                <item.icon aria-hidden />
                <span>{item.title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => run(() => setTheme("light"))}>
              <Sun aria-hidden /> Light
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme("dark"))}>
              <Moon aria-hidden /> Dark
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme("system"))}>
              <Monitor aria-hidden /> System
              <CommandShortcut>auto</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
