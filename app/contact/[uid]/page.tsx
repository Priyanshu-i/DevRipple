"use client"

import { useParams } from "next/navigation"
import { db } from "@/lib/firebase"
import useSWRSubscription from "swr/subscription"
import { onValue, ref } from "firebase/database"
import { paths } from "@/lib/paths"

// --- TYPES ---
interface UserPublicProfile {
    displayName?: string
    username?: string
    bio?: string
    linkedin?: string
    github?: string
    website?: string
}

// Type for the SWR subscription 'next' callback parameter
type NextCallback<T> = { next: (err: any, data: T) => void }

// --- COMPONENT ---

export default function ContactPage() {
  const { uid } = useParams<{ uid: string }>()
  
  // 1. Public Profile Data Subscription (userPublic/{uid})
  const { data: profile } = useSWRSubscription<UserPublicProfile>(
    uid ? paths.userPublic(uid) : null,
    (key: string, { next }: NextCallback<UserPublicProfile>) => {
      if (!uid) return
      console.log("📊 Subscribing to public profile at:", key)
      const unsub = onValue(ref(db, key), (snap) => {
        const data = snap.val() as UserPublicProfile
        console.log("📊 Public profile data received:", data)
        next(null, data)
      })
      return () => unsub()
    }
  )

  if (!uid) {
    return <main className="mx-auto max-w-3xl px-4 py-8">No user specified.</main>
  }

  if (!profile) {
    return <main className="mx-auto max-w-3xl px-4 py-8">Loading...</main>
  }
  
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Contact</h1>

      <div className="mb-6 rounded-md border p-4">
        <div className="mb-3 text-sm font-medium">About</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Display Name</div>
            <div className="text-sm">{profile?.displayName || "—"}</div>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Username</div>
            <div className="text-sm">{profile?.username || "—"}</div>
          </div>
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-muted-foreground">Bio</div>
            <div className="text-sm">{profile?.bio || "—"}</div>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">LinkedIn</div>
            <a className="text-sm underline" href={profile?.linkedin || "#"} target="_blank" rel="noreferrer">
              {profile?.linkedin || "—"}
            </a>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">GitHub</div>
            <a className="text-sm underline" href={profile?.github || "#"} target="_blank" rel="noreferrer">
              {profile?.github || "—"}
            </a>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Website</div>
            <a className="text-sm underline" href={profile?.website || "#"} target="_blank" rel="noreferrer">
              {profile?.website || "—"}
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}