import type { z } from "zod"

import { ErrorBodySchema } from "@/lib/schemas"

/** Error raised for non-2xx responses or contract violations. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * Fetches a same-origin JSON endpoint and validates the payload with Zod so
 * the UI never renders data that does not match the contract.
 */
export async function apiGet<T extends z.ZodType>(
  path: string,
  schema: T,
  signal?: AbortSignal
): Promise<z.infer<T>> {
  const response = await fetch(path, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
    credentials: "same-origin",
  })

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const parsed = ErrorBodySchema.safeParse(body)
    throw new ApiError(
      parsed.success
        ? parsed.data.error.message
        : `Request failed (${response.status})`,
      response.status,
      parsed.success ? parsed.data.error.code : "HTTP_ERROR"
    )
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ApiError(
      "The server returned an unexpected response. Try reloading the page.",
      response.status,
      "INVALID_RESPONSE"
    )
  }
  return result.data
}
