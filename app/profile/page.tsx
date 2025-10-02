"use client"

import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import useSWRSubscription from "swr/subscription"
import { onValue, ref, update } from "firebase/database"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo } from "react"
import { ProfileForm } from "@/components/profile/profile-form"
import { NotificationsPanel } from "@/components/notifications/notifications-panel"
import { paths } from "@/lib/paths"

// --- SHADCN & LUCIDE IMPORTS ---
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Link,
  Github,
  Code,
  Users,
  MessageSquare,
  Award, 
  PenSquare, 
  Mail,
  UserCheck, // New icon for ProfileForm visibility
  X,
  Bell, // New icon for Notifications
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog" // Added Dialog for ProfileForm

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

// --- CONSTANTS & HELPERS ---
const TWITTER_BLUE = "text-sky-500" // A nice constant color for links/icons

// --- COMPONENT ---

export default function ProfilePage() {
  const { user } = useAuth()
  
  // Data Subscriptions (Unchanged Logic)
  const { data: profile } = useSWRSubscription<UserProfile>(
    user ? paths.user(user.uid) : null,
    (key: string, { next }: NextCallback<UserProfile>) => {
      if (!user) return
      const unsub = onValue(ref(db, key), (snap) => {
        const data = snap.val() as UserProfile
        next(null, data)
      })
      return () => unsub()
    }
  )

  const { data: userGroups } = useSWRSubscription<UserGroups>(
    user ? paths.userGroups(user.uid) : null,
    (key: string, { next }: NextCallback<UserGroups>) => {
      const unsub = onValue(ref(db, key), (snap) => {
        const data = (snap.val() || {}) as UserGroups
        next(null, data)
      })
      return () => unsub()
    }
  )

  const { data: authoredIndex } = useSWRSubscription<SubmissionIndex>(
    user ? `indexByAuthor/${user.uid}` : null,
    (key: string, { next }: NextCallback<SubmissionIndex>) => {
      const unsub = onValue(ref(db, key), (snap) => {
        const data = (snap.val() || {}) as SubmissionIndex
        next(null, data)
      })
      return () => unsub()
    }
  )

  // Editable State for Preferences
  const [isEditingPreferences, setIsEditingPreferences] = useState(false)
  const [language, setLanguage] = useState("")
  const [github, setGithub] = useState("")
  const [leetcode, setLeetcode] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  
  // State for Edit Profile Dialog
  const [isProfileFormOpen, setIsProfileFormOpen] = useState(false) // New State

  // Data Fetching States (Unchanged Logic)
  const [groupNames, setGroupNames] = useState<NameMap>({})
  const [submissionNames, setSubmissionNames] = useState<NameMap>({})

  // Sync local state with profile data (Unchanged Logic)
  useEffect(() => {
    if (profile) {
      setLanguage(profile.preferredLanguage ?? "")
      setGithub(profile.github ?? "")
      setLeetcode(profile.leetcode ?? "")
    }
  }, [profile]) 
  
  // Fetch Group Names (Unchanged Logic)
  useEffect(() => {
    if (!userGroups || Object.keys(userGroups).length === 0) return

    const groupIdsToFetch = Object.keys(userGroups).filter(gid => !groupNames[gid])
    if (groupIdsToFetch.length === 0) return

    const listeners: (() => void)[] = []

    groupIdsToFetch.forEach(gid => {
      const groupRef = ref(db, `${paths.group(gid)}/name`)
      const listener = onValue(groupRef, (snap) => {
        const name = snap.val() as string
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

  // Fetch Submission Names (Unchanged Logic)
  useEffect(() => {
    if (!authoredIndex || Object.keys(authoredIndex).length === 0) return
    
    const submissionIds = Object.keys(authoredIndex).slice(0, 5)
    const submissionsToFetch = submissionIds
      .filter(sid => !submissionNames[sid])
      .map(sid => ({ sid, ...authoredIndex[sid] }))
    
    if (submissionsToFetch.length === 0) return

    const listeners: (() => void)[] = []

    submissionsToFetch.forEach(({ sid, groupId, questionId }) => {
      const solutionPath = paths.solutionDocument(groupId, questionId, sid)
      const solutionRef = ref(db, `${solutionPath}/title`)
      
      const listener = onValue(solutionRef, (snap) => {
        const title = snap.val() as string
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

  // Save user preferences (Unchanged Logic)
  const handleSavePreferences = async () => {
    if (!user) {
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
    
    try {
      await update(ref(db, userPath), updateData)
      setSaveMessage("Preferences saved successfully! 🎉")
      setIsEditingPreferences(false) 
    } catch (error) {
      setSaveMessage(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(""), 5000)
    }
  }

  // Memoized user profile info for display (Unchanged Logic)
  const userProfile = useMemo(() => ({
    displayName: profile?.displayName || user?.displayName || "Anonymous",
    username: profile?.username || `user-${user?.uid.substring(0, 5)}`,
    bio: profile?.bio || "No bio yet.",
    github: profile?.github || "—",
    linkedin: profile?.linkedin || "—",
    website: profile?.website || "—",
  }), [profile, user])

  // Helpers (Unchanged Logic)
  const getGroupName = (gid: string) => groupNames[gid] || gid
  const getSubmissionName = (sid: string) => submissionNames[sid] || sid
  
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card className="p-6 text-center">
          <CardTitle>Authentication Required</CardTitle>
          <p className="mt-2 text-muted-foreground">Please sign in to view your profile.</p>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl pb-10">
      {/* 1. Cover Image and Profile Header (Twitter-like) */}
      <div className="relative border-b">
        {/* Placeholder for Cover Photo */}
        <div className="h-48 w-full bg-slate-200 dark:bg-slate-800" />
        
        <div className="p-4">
          {/* Avatar and Edit Profile Button (FIXED: Now uses Dialog) */}
          <div className="flex justify-between">
            <img
              src={user.photoURL || "/placeholder-user.jpg"}
              alt={`${userProfile.displayName}'s avatar`}
              className="mt-[-70px] h-28 w-28 rounded-full border-4 border-background object-cover shadow-lg"
            />
            
            {/* The Edit Profile Button is now a DialogTrigger */}
            <Dialog open={isProfileFormOpen} onOpenChange={setIsProfileFormOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-2 font-semibold">
                        <PenSquare className="mr-2 h-4 w-4" />
                        Edit Profile
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <UserCheck className="mr-2 h-5 w-5" />
                            Update Your Main Profile
                        </DialogTitle>
                    </DialogHeader>
                    {/* ProfileForm is rendered inside the Dialog */}
                    <ProfileForm /> 
                </DialogContent>
            </Dialog>

          </div>

          {/* User Info (Unchanged Logic) */}
          <div className="mt-4">
            <h1 className="text-xl font-bold">{userProfile.displayName}</h1>
            <p className="text-sm text-muted-foreground">@{userProfile.username}</p>
          </div>
          
          {/* Bio and Links (Unchanged Logic) */}
          <p className="mt-3 text-base">{userProfile.bio}</p>
          
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {user.email}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Joined {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
            </span>
            {userProfile.website !== "—" && (
                <a 
                    href={userProfile.website.startsWith('http') ? userProfile.website : `https://${userProfile.website}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className={`flex items-center gap-1 hover:underline ${TWITTER_BLUE}`}
                >
                    <Link className="h-4 w-4" />
                    {userProfile.website}
                </a>
            )}
          </div>
        </div>
      </div>
      
      {/* Separator for 'Tabs' look */}
      <Separator />

      {/* Main Content Area: Divided into Cards for Sections */}
      <div className="grid gap-6 p-4 md:grid-cols-2 lg:grid-cols-3">
        
        {/* 2. Preferences Card (The Editable Section) */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Code className="h-5 w-5" />
                Coding Preferences & Links
            </CardTitle>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                    setIsEditingPreferences(!isEditingPreferences)
                    setSaveMessage("") 
                }}
            >
                {isEditingPreferences ? "Cancel Edit" : "Edit Preferences"}
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {isEditingPreferences ? (
              // EDIT MODE
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
                <div className="flex items-center justify-between pt-2">
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
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              // DISPLAY MODE
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Language</div>
                  <div className="flex items-center gap-2 text-sm">
                      <Code className={`h-4 w-4 ${TWITTER_BLUE}`} />
                      {profile?.preferredLanguage || "Not set"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">GitHub</div>
                  <a 
                    className={`flex items-center gap-2 text-sm hover:underline ${TWITTER_BLUE}`}
                    href={profile?.github || "#"} 
                    target="_blank" 
                    rel="noreferrer"
                  >
                      <Github className="h-4 w-4" />
                      {profile?.github ? new URL(profile.github).pathname.split('/').pop() : "Not linked"}
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">LeetCode</div>
                  <a 
                    className={`flex items-center gap-2 text-sm hover:underline ${TWITTER_BLUE}`} 
                    href={profile?.leetcode || "#"} 
                    target="_blank" 
                    rel="noreferrer"
                  >
                      <Award className="h-4 w-4" />
                      {profile?.leetcode ? new URL(profile.leetcode).pathname.split('/').pop() : "Not linked"}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Groups Card (Unchanged Logic) */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userGroups && Object.keys(userGroups).length ? (
              <ul className="space-y-2">
                {Object.keys(userGroups).slice(0, 5).map((gid) => (
                  <li key={gid}>
                    <a href={`/groups/${gid}`} className={`text-sm hover:underline ${TWITTER_BLUE}`}>
                      {getGroupName(gid)}
                    </a>
                  </li>
                ))}
                {Object.keys(userGroups).length > 5 && (
                    <li className="text-xs text-muted-foreground">...and {Object.keys(userGroups).length - 5} more</li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No groups yet.</p>
            )}
          </CardContent>
        </Card>

        {/* 4. Submissions Card (Unchanged Logic) */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Latest Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {authoredIndex && Object.keys(authoredIndex).length ? (
              <ul className="space-y-2">
                {Object.keys(authoredIndex)
                  .slice(0, 5)
                  .map((sid) => (
                    <li key={sid} className="text-sm">
                      <a href={`/search?solution=${sid}`} className={`hover:underline ${TWITTER_BLUE}`}>
                        {getSubmissionName(sid)}
                      </a>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            )}
          </CardContent>
        </Card>
        
        {/* 5. Notifications Card (Enhanced Styling) */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* The NotificationsPanel is rendered here */}
            <NotificationsPanel />
          </CardContent>
        </Card>

      </div>
    </main>
  )
}