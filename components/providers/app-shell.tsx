"use client"

import type React from "react"

import { AuthProvider } from "@/hooks/use-auth"
import { TopNav } from "@/components/nav/top-nav"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TopNav />
      {children}
    </AuthProvider>
  )
}
