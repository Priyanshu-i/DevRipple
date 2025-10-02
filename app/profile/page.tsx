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
import { paths } from "@/lib/paths"

// --- TYPES ---

interface NameMap {
  [id: string]: string
}

interface SubmissionIndex {
  [solutionId: string]: {
    groupId: string
    questionId: string
  }
}

interface UserProfile {
  preferredLanguage?: string
  github?: string
  leetcode?: string
  displayName?: string
  username?: string
  bio?: string
  linkedin?: string
  website?: string
}

interface UserGroups {
  [groupId: string]: boolean
}

type NextCallback<T> = { next: (err: any, data: T) => void }

// --- COMPONENT ---

export default function ProfilePage() {
  const { user } = useAuth()
  
  // 1. Profile Data Subscription (users/{uid})
  const { data: profile } = useSWRSubscription<UserProfile>(
    user ? paths.user(user.uid) : null,
    (key: string, { next }: NextCallback<UserProfile>) => {
      if (!user) return
      console.log("📊 Subscribing to profile at:", key)
      const unsub = onValue(ref(db, key), (snap) => {
        const data = snap.val() as UserProfile
        console.log("📊 Profile data received:", data)
        next(null, data)
      })
      return () => unsub()
    }
  )

  // 2. User Groups Subscription (userGroups/{uid})
  const { data: userGroups } = useSWRSubscription<UserGroups>(
    user ? paths.userGroups(user.uid) : null,
    (key: string, { next }: NextCallback<UserGroups>) => {
      console.log("📊 Subscribing to userGroups at:", key)
      const unsub = onValue(ref(db, key), (snap) => {
        const data = (snap.val() || {}) as UserGroups
        console.log("📊 UserGroups data received:", data)
        next(null, data)
      })
      return () => unsub()
    }
  )

  // 3. Authored Submissions Index Subscription
  const { data: authoredIndex } = useSWRSubscription<SubmissionIndex>(
    user ? `indexByAuthor/${user.uid}` : null,
    (key: string, { next }: NextCallback<SubmissionIndex>) => {
      console.log("📊 Subscribing to authoredIndex at:", key)
      const unsub = onValue(ref(db, key), (snap) => {
        const data = (snap.val() || {}) as SubmissionIndex
        console.log("📊 AuthoredIndex data received:", data)
        next(null, data)
      })
      return () => unsub()
    }
  )

  const [language, setLanguage] = useState("")
  const [github, setGithub] = useState("")
  const [leetcode, setLeetcode] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  
  const [groupNames, setGroupNames] = useState<NameMap>({})
  const [submissionNames, setSubmissionNames] = useState<NameMap>({})

  // Sync local state with profile data
  useEffect(() => {
    if (profile) {
      console.log("🔄 Syncing local state with profile:", profile)
      setLanguage(profile.preferredLanguage ?? "")
      setGithub(profile.github ?? "")
      setLeetcode(profile.leetcode ?? "")
    }
  }, [profile]) 
  
  // Fetch Group Names
  useEffect(() => {
    if (!userGroups || Object.keys(userGroups).length === 0) return

    const groupIdsToFetch = Object.keys(userGroups).filter(gid => !groupNames[gid])
    if (groupIdsToFetch.length === 0) return

    console.log("🔍 Fetching group names for:", groupIdsToFetch)
    const listeners: (() => void)[] = []

    groupIdsToFetch.forEach(gid => {
      const groupRef = ref(db, `${paths.group(gid)}/name`)
      const listener = onValue(groupRef, (snap) => {
        const name = snap.val() as string
        console.log(`📝 Group ${gid} name:`, name)
        setGroupNames(prev => ({ 
          ...prev, 
          [gid]: name || "Group (Deleted/Unknown)" 
        }))
      })
      listeners.push(listener)
    })

    return () => {
      listeners.forEach(unsub => unsub())
    }
  }, [userGroups, groupNames])

  // Fetch Submission Names
  useEffect(() => {
    if (!authoredIndex || Object.keys(authoredIndex).length === 0) return
    
    const submissionIds = Object.keys(authoredIndex).slice(0, 5)
    const submissionsToFetch = submissionIds
      .filter(sid => !submissionNames[sid])
      .map(sid => ({ sid, ...authoredIndex[sid] }))
    
    if (submissionsToFetch.length === 0) return

    console.log("🔍 Fetching submission names for:", submissionsToFetch)
    const listeners: (() => void)[] = []

    submissionsToFetch.forEach(({ sid, groupId, questionId }) => {
      const solutionPath = paths.solutionDocument(groupId, questionId, sid)
      const solutionRef = ref(db, `${solutionPath}/title`)
      
      console.log(`🔍 Fetching title for submission ${sid} at:`, `${solutionPath}/title`)
      
      const listener = onValue(solutionRef, (snap) => {
        const title = snap.val() as string
        console.log(`📝 Submission ${sid} title:`, title)
        setSubmissionNames(prev => ({ 
          ...prev, 
          [sid]: title || "Submission (Deleted/Unknown)" 
        }))
      })
      listeners.push(listener)
    })

    return () => {
      listeners.forEach(unsub => unsub())
    }
  }, [authoredIndex, submissionNames])

  // Save user preferences
  const handleSavePreferences = async () => {
    if (!user) {
      console.error("❌ No user found")
      window.alert("Error: User not authenticated")
      return
    }
    
    setIsSaving(true)
    setSaveMessage("")
    
    const updateData = {
      preferredLanguage: language,
      github: github,
      leetcode: leetcode
    }
    
    const userPath = paths.user(user.uid)
    console.log("💾 Saving preferences to:", userPath)
    console.log("💾 Update data:", updateData)
    
    try {
      await update(ref(db, userPath), updateData)
      console.log("✅ Preferences saved successfully!")
      setSaveMessage("Preferences saved successfully! 🎉")
      window.alert("✅ Profile updated successfully!")
    } catch (error) {
      console.error("❌ Error updating user preferences:", error)
      setSaveMessage(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
      window.alert(`❌ Failed to update profile:\n${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(""), 5000)
    }
  }

  if (!user) {
    console.log("⚠️ No user authenticated")
    return <main className="mx-auto max-w-3xl px-4 py-8">Sign in to view your profile.</main>
  }

  const getGroupName = (gid: string) => groupNames[gid] || gid
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
              <Input 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)} 
                placeholder="e.g., C++, Python" 
              />
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
            <div className="flex items-center justify-between">
              {saveMessage && (
                <p className={`text-sm ${saveMessage.includes("Failed") ? 'text-red-500' : 'text-green-500'}`}>
                  {saveMessage}
                </p>
              )}
              <Button
                onClick={handleSavePreferences}
                disabled={isSaving}
                className="ml-auto"
              >
                {isSaving ? "Saving..." : "Save Preferences"}
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
          <div className="rounded-md border p-4">
            <div className="mb-3 text-sm font-medium">Your Groups</div>
            {userGroups && Object.keys(userGroups).length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {Object.keys(userGroups).map((gid) => (
                  <li key={gid}>
                    <a href={`/groups/${gid}`} className="underline">
                      {getGroupName(gid)}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">No groups yet.</div>
            )}
          </div>

          <div className="rounded-md border p-4">
            <div className="mb-3 text-sm font-medium">Your Submissions (Last 5)</div>
            {authoredIndex && Object.keys(authoredIndex).length ? (
              <ul className="space-y-2">
                {Object.keys(authoredIndex)
                  .slice(0, 5)
                  .map((sid) => (
                    <li key={sid} className="text-sm">
                      <a href={`/search?solution=${sid}`} className="underline">
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