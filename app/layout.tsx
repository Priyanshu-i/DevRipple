import type React from "react"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AppShell } from "@/components/providers/app-shell"
import { Suspense } from "react"

export const metadata = {
  title: "DevRipple",
  description: "Created By Priyanshu | Peer Groups Coding platform",
  generator: "DevRipple.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <AppShell>{children}</AppShell>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
