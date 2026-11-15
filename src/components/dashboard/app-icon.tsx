"use client"

import { useMemo, useState } from "react"
import { AppWindow } from "lucide-react"
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic"

import { cn } from "@/lib/utils"

const ICON_NAMES: ReadonlySet<string> = new Set(iconNames)

function isImageUrl(value: string) {
  return /^(https?:)?\/\//.test(value) || value.startsWith("/")
}

/**
 * Renders an application icon: a Lucide icon name (`film`, `hard-drive`), an
 * image URL, or a generic fallback.
 */
export function AppIcon({
  icon,
  name,
  className,
}: {
  icon: string | null
  name: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const lucideName = useMemo(() => {
    const normalized = icon?.trim().toLowerCase()
    return normalized && ICON_NAMES.has(normalized)
      ? (normalized as IconName)
      : null
  }, [icon])

  if (icon && isImageUrl(icon) && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote icons; next/image would need every host allow-listed
      <img
        src={icon}
        alt=""
        className={cn("object-contain", className)}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    )
  }

  if (lucideName) {
    return (
      <DynamicIcon
        name={lucideName}
        className={className}
        aria-label={name}
        fallback={() => <AppWindow className={className} aria-hidden />}
      />
    )
  }

  return <AppWindow className={className} aria-hidden />
}
