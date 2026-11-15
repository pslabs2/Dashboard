"use client"

import { AlertTriangle, RotateCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api/client"

export function errorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message
  return "Something went wrong."
}

/** Inline error for a failed query, with a retry action. */
export function QueryError({
  error,
  title = "Could not load data",
  onRetry,
}: {
  error: unknown
  title?: string
  onRetry?: () => void
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="gap-3">
        <p>{errorMessage(error)}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw aria-hidden /> Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
