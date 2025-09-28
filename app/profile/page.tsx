"use client"

import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import useSWRSubscription from "swr/subscription"
import { onValue, ref, update } from "firebase/database"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { ProfileForm } from "@/components/profile/profile-form"
import { NotificationsPanel } from "@/components/notifications/notifications-panel"

// Define a type for fetched names (Group or Submission Title)
interface NameMap {
  [id: string]: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: profile } = useSWRSubscription(user ? `users/${user.uid}` : null, (key, { next }) => {
    if (!user) return
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
    return () => unsub()
  })

  // Fetches the IDs of groups the user belongs to
  const { data: userGroups } = useSWRSubscription(user ? `userGroups/${user.uid}` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() || {}))
    return () => unsub()
  })

  // Fetches the IDs of submissions authored by the user
  const { data: authoredIndex } = useSWRSubscription(user ? `indexByAuthor/${user.uid}` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() || {}))
    return () => unsub()
  })

  const [language, setLanguage] = useState(profile?.preferredLanguage ?? "")
  const [github, setGithub] = useState(profile?.github ?? "")
  const [leetcode, setLeetcode] = useState(profile?.leetcode ?? "")
  
  // New state for storing names
  const [groupNames, setGroupNames] = useState<NameMap>({})
  const [submissionNames, setSubmissionNames] = useState<NameMap>({})

  useEffect(() => {
    if (profile) {
      setLanguage(profile.preferredLanguage ?? "")
      setGithub(profile.github ?? "")
      setLeetcode(profile.leetcode ?? "")
    }
  }, [profile])
  
  // --- Effect to Fetch Group Names ---
  useEffect(() => {
    if (!userGroups || Object.keys(userGroups).length === 0) return

    const groupIdsToFetch = Object.keys(userGroups).filter(gid => !groupNames[gid])
    if (groupIdsToFetch.length === 0) return

    const listeners: (() => void)[] = []

    groupIdsToFetch.forEach(gid => {
      // Assuming groups are stored under the path `groups/${groupId}`
      const groupRef = ref(db, `groups/${gid}/name`)
      const listener = onValue(groupRef, (snap) => {
        const name = snap.val()
        if (name) {
          setGroupNames(prev => ({ ...prev, [gid]: name }))
        } else {
          setGroupNames(prev => ({ ...prev, [gid]: "Group (Deleted/Unknown)" }))
        }
      })
      listeners.push(listener)
    })

    return () => {
      listeners.forEach(unsub => unsub())
    }
  }, [userGroups, groupNames]) // Add groupNames to dependency to avoid re-fetching loaded ones


  // --- Effect to Fetch Submission Names (Titles) ---
  useEffect(() => {
    if (!authoredIndex || Object.keys(authoredIndex).length === 0) return
    
    // Only fetch for the first 5 submissions displayed
    const submissionIds = Object.keys(authoredIndex).slice(0, 5)
    const submissionIdsToFetch = submissionIds.filter(sid => !submissionNames[sid])
    
    if (submissionIdsToFetch.length === 0) return

    const listeners: (() => void)[] = []

    submissionIdsToFetch.forEach(sid => {
      // Assuming submissions/solutions are stored under `solutions/${solutionId}/title`
      const solutionRef = ref(db, `solutions/${sid}/title`)
      const listener = onValue(solutionRef, (snap) => {
        const title = snap.val()
        if (title) {
          setSubmissionNames(prev => ({ ...prev, [sid]: title }))
        } else {
          setSubmissionNames(prev => ({ ...prev, [sid]: "Submission (Deleted/Unknown)" }))
        }
      })
      listeners.push(listener)
    })

    return () => {
      listeners.forEach(unsub => unsub())
    }
  }, [authoredIndex, submissionNames]) // Add submissionNames to dependency to avoid re-fetching loaded ones


  if (!user) return <main className="mx-auto max-w-3xl px-4 py-8">Sign in to view your profile.</main>

  // Function to get Group Name or fall back to ID
  const getGroupName = (gid: string) => groupNames[gid] || gid
  
  // Function to get Submission Name/Title or fall back to ID
  const getSubmissionName = (sid: string) => submissionNames[sid] || sid
  
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Profile</h1>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <ProfileForm />
        <div className="rounded-md border p-4">
          <div className="mb-3 text-sm font-medium">Notifications</div>
          <NotificationsPanel />
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <img
          src={user.photoURL || "/placeholder-user.jpg"}
          alt="User avatar"
          className="h-12 w-12 rounded-full border object-cover"
        />
        <div>
          <div className="text-base font-medium">{user.displayName || "Anonymous"}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-md border p-4">
          <div className="mb-3 text-sm font-medium">Preferences</div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">Preferred Language</label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g., C++, Python" />
            </div>
            <div>
              <label className="mb-1 block text-sm">GitHub URL</label>
              <Input
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/yourname"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">LeetCode URL</label>
              <Input
                value={leetcode}
                onChange={(e) => setLeetcode(e.target.value)}
                placeholder="https://leetcode.com/yourname"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  if (!user) return
                  await update(ref(db, `users/${user.uid}`), { preferredLanguage: language, github, leetcode })
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-md border p-4">
          <div className="mb-3 text-sm font-medium">About You</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Display Name</div>
              <div className="text-sm">{profile?.displayName || user.displayName || "—"}</div>
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
            <div className="md:col-span-2">
              <a className="text-sm underline" href={`/contact/${user.uid}`}>
                View your public contact page
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* --- Updated Your Groups Section --- */}
          <div className="rounded-md border p-4">
            <div className="mb-3 text-sm font-medium">Your Groups</div>
            {userGroups && Object.keys(userGroups).length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {Object.keys(userGroups).map((gid) => (
                  <li key={gid}>
                    <a href={`/groups/${gid}`} className="underline">
                      {/* Use getGroupName to display the name */}
                      {getGroupName(gid)}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">No groups yet.</div>
            )}
          </div>

          {/* --- Updated Your Submissions Section --- */}
          <div className="rounded-md border p-4">
            <div className="mb-3 text-sm font-medium">Your Submissions</div>
            {authoredIndex && Object.keys(authoredIndex).length ? (
              <ul className="space-y-2">
                {Object.keys(authoredIndex)
                  .slice(0, 5)
                  .map((sid) => (
                    <li key={sid} className="text-sm">
                      <a href={`/search?solution=${sid}`} className="underline">
                        {/* Use getSubmissionName to display the title/name */}
                        {getSubmissionName(sid)}
                      </a>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">No submissions yet.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}