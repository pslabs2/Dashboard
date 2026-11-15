"use client"

import { useState, type ReactNode } from "react"
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"

import { TooltipProvider } from "@/components/ui/tooltip"
import { ApiError } from "@/lib/api/client"

const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Matches the server prefetch so hydrated data is not refetched at once.
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      // Polling pauses while the tab is hidden (TanStack default).
      refetchIntervalInBackground: false,
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
}

export function Providers({
  children,
  nonce,
}: {
  children: ReactNode
  nonce?: string
}) {
  const [queryClient] = useState(() => new QueryClient(queryConfig))

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
