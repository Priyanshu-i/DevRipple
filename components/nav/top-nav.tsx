"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export function TopNav() {
  const { user, signIn, signOutUser } = useAuth()
  return (
    <header className="border-b bg-card">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          DevRipple
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm hover:underline">
            Dashboard
          </Link>
          <Link href="/search" className="text-sm hover:underline">
            Search
          </Link>
          <Link href="/leaderboard" className="text-sm hover:underline">
            Leaderboard
          </Link>
          {user ? (
            <>
              <Link href="/profile" className="text-sm hover:underline">
                Profile
              </Link>
              <Button size="sm" variant="secondary" onClick={signOutUser}>
                Sign out
              </Button>
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? "user"} />
                <AvatarFallback>{user.displayName?.[0] ?? "U"}</AvatarFallback>
              </Avatar>
            </>
          ) : (
            <Button size="sm" onClick={signIn}>
              Sign in with Google
            </Button>
          )}
        </div>
      </nav>
    </header>
  )
}
