"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getDatabase, ref, onValue } from "firebase/database"
import { paths } from "@/lib/paths"
import Link from "next/link"

// Define a type for the expected user profile structure
interface UserProfile {
  displayName?: string
  username?: string
  bio?: string
  linkedin?: string
  github?: string
  website?: string
  // Add other public fields as needed
}

export default function ContactPage() {
  const { uid } = useParams<{ uid: string }>()
  const db = getDatabase()
  // Use the UserProfile interface for better type safety
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    if (!uid) return

    // CRITICAL CHANGE: If 'paths.userPublic' does not return the full profile data,
    // you should use the path that points to the main user profile node: paths.user(uid).
    // Assuming 'paths.user(uid)' points to "users/{uid}" which holds the public data.
    const userRef = ref(db, paths.user(uid))

    const unsub = onValue(userRef, (snap) => {
        const userData = snap.val()
        if (userData) {
             setUser(userData)
        } else {
             // Handle case where user profile might not exist (optional)
             setUser(null) 
        }
    })
    
    return () => unsub()
  }, [db, uid])

  if (!user) {
    return (
        <main className="container mx-auto p-6">
            {/* Display a more informative message */}
            <h1 className="text-2xl font-semibold">Loading or Profile Not Found...</h1>
        </main>
    )
  }

  // Fallback for cases where displayName might be missing but the user object exists
  const displayName = user.displayName || "Anonymous User"

  return (
    <main className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{displayName}</h1>
        {user.username && <p className="text-muted-foreground">@{user.username}</p>}
      </header>
      
      {user.bio && <p className="text-pretty">{user.bio}</p>}
      
      <div className="flex flex-col gap-2"> {/* Changed to flex-col for better link stacking */}
        <h2 className="text-xl font-semibold">Contact Links</h2>
        <div className="flex gap-4 flex-wrap">
            {user.linkedin && (
              <Link className="underline text-blue-600 hover:text-blue-800" href={user.linkedin} target="_blank" rel="noopener noreferrer">
                LinkedIn
              </Link>
            )}
            {user.github && (
              <Link className="underline text-blue-600 hover:text-blue-800" href={user.github} target="_blank" rel="noopener noreferrer">
                GitHub
              </Link>
            )}
            {user.website && (
              <Link className="underline text-blue-600 hover:text-blue-800" href={user.website} target="_blank" rel="noopener noreferrer">
                Website
              </Link>
            )}
        </div>
      </div>
    </main>
  )
}