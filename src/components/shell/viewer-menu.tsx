"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Viewer } from "@/server/auth"

function initials(value: string) {
  const parts = value.split(/[\s@._-]+/).filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  )
}

/** Identity provided by the forward-auth proxy (`AUTH_MODE=proxy`). */
export function ViewerMenu({ viewer }: { viewer: Viewer }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full"
          aria-label={`Signed in as ${viewer.user}`}
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">
              {initials(viewer.user)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="grid gap-0.5 font-normal">
          <span className="text-xs text-muted-foreground">Signed in as</span>
          <span className="truncate font-medium">{viewer.user}</span>
          {viewer.email && viewer.email !== viewer.user && (
            <span className="truncate text-xs text-muted-foreground">
              {viewer.email}
            </span>
          )}
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
