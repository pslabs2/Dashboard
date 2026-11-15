import type { Metadata, Viewport } from "next"
import { cookies, headers } from "next/headers"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import "./globals.css"
import { Providers } from "@/components/providers"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { SiteHeader } from "@/components/shell/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { viewerFromHeaders } from "@/server/auth"
import { getDashboardConfig } from "@/server/config"
import { logger } from "@/server/log"
async function getTitle() {
  try {
    return (await getDashboardConfig()).title
  } catch (error) {
    // Pages surface config errors through the API; keep the shell usable.
    logger.throttled("layout-config", "error", "Could not load dashboard config", { error })
    return "Homelab"
  }
}
export async function generateMetadata(): Promise<Metadata> {
  const title = await getTitle()
  return {
    title: { default: title, template: `%s · ${title}` },
    description: "Homelab applications, Kubernetes cluster health and GitOps status.",
    applicationName: "Homelab Dashboard",
    robots: { index: false, follow: false },
  }
}
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  colorScheme: "dark light",
}
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [requestHeaders, cookieStore, title] = await Promise.all([
    headers(),
    cookies(),
    getTitle(),
  ])
  const nonce = requestHeaders.get("x-nonce") ?? undefined
  const viewer = viewerFromHeaders(requestHeaders)
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-svh bg-background font-sans antialiased">
        <Providers nonce={nonce}>
          <SidebarProvider defaultOpen={sidebarOpen}>
            <AppSidebar title={title} />
            <SidebarInset className="min-w-0">
              <SiteHeader viewer={viewer} />
              <main
                id="main"
                className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 p-4 md:p-6"
              >
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  )
}