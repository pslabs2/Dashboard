import { cn } from "@/lib/utils"

export type Tone = "ok" | "warning" | "error" | "info" | "muted"

const TONE_CLASSES: Record<Tone, string> = {
  ok: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground/50",
}

export function StatusDot({
  tone,
  pulse = false,
  className,
}: {
  tone: Tone
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn("relative inline-flex size-2 shrink-0", className)}
      aria-hidden
    >
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none",
            TONE_CLASSES[tone]
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          TONE_CLASSES[tone]
        )}
      />
    </span>
  )
}
