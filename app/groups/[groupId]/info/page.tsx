"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { getAuth } from "firebase/auth"
import { getDatabase, ref, onValue } from "firebase/database"
import { paths } from "@/lib/paths"
import { GroupAdminSettings } from "@/components/groups/group-admin-settings"

// Define a type for the user profile data you need
interface UserProfile {
  displayName: string
}

export default function GroupInfoPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const auth = getAuth()
  const db = getDatabase()
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<Record<string, boolean>>({})
  const [isMember, setIsMember] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  
  // New state to store user profiles keyed by UID
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})

  // Function to get the display name from UID, returns UID if profile not found/loaded
  const getDisplayName = useCallback((uid: string) => {
    return userProfiles[uid]?.displayName || uid
  }, [userProfiles])

  // --- Group Data and Membership Effects ---

  useEffect(() => {
    if (!groupId) return
    const unsub1 = onValue(ref(db, paths.group(groupId)), (snap) => setGroup(snap.val()))
    const unsub2 = onValue(ref(db, paths.groupMembers(groupId)), (snap) => setMembers(snap.val() || {}))
    return () => {
      unsub1()
      unsub2()
    }
  }, [db, groupId])

  useEffect(() => {
    if (!group) return
    const uid = auth.currentUser?.uid
    setIsAdmin(group.adminUid === uid)
    setIsMember(!!members[uid || ""])
  }, [group, members, auth])

  // --- New Effect for Fetching User Profiles ---

  useEffect(() => {
    // Combine Admin UID and Member UIDs into a single set of unique UIDs
    const uidsToFetch = new Set<string>()
    if (group?.adminUid) {
      uidsToFetch.add(group.adminUid)
    }
    Object.keys(members).forEach(uid => uidsToFetch.add(uid))

    // Don't fetch if there are no UIDs or the profiles are already loaded
    if (uidsToFetch.size === 0) return

    // Keep track of all active listeners for cleanup
    const listeners: (() => void)[] = []

    uidsToFetch.forEach(uid => {
      // Check if we've already loaded this profile to avoid redundant listeners
      if (userProfiles[uid]) return; 

      const userRef = ref(db, paths.user(uid))
      const listener = onValue(userRef, (snap) => {
        const v = snap.val()
        if (v) {
          // Update the userProfiles state with the fetched data
          setUserProfiles(prev => ({
            ...prev,
            [uid]: { displayName: v.displayName || "No Name" } // Use "No Name" or similar fallback
          }))
        }
      })
      listeners.push(listener)
    })

    // Cleanup function: remove all active listeners
    return () => {
      listeners.forEach(unsub => unsub())
    }
    // Dependency includes userProfiles to avoid re-fetching already loaded users
    // It is important to also include `group` and `members` to trigger fetch when they update
  }, [db, group, members, userProfiles]) 


  // --- Render Section (Updated to use getDisplayName) ---

  return (
    <main className="container mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{group?.name || "Group"}</h1>
        <p className="text-muted-foreground">{group?.description}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">About</h2>
        {/* Use the getDisplayName function for the Admin */}
        <p className="text-sm text-muted-foreground">Admin: {group?.adminUid ? getDisplayName(group.adminUid) : "Loading..."}</p>
        <p className="text-sm text-muted-foreground">Discoverable: {group?.discoverable ? "Yes" : "No"}</p>
      </section>

      {isMember && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Members</h2>
          <ul className="list-disc pl-5">
            {Object.keys(members).map((uid) => (
              <li key={uid} className="text-sm">
                {/* Use the getDisplayName function for members */}
                {getDisplayName(uid)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Admin Settings</h2>
          <GroupAdminSettings groupId={groupId} />
        </section>
      )}
    </main>
  )
}