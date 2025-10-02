"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { getAuth } from "firebase/auth"
import { getDatabase, ref, onValue } from "firebase/database"
import { paths } from "@/lib/paths"
import { GroupAdminSettings } from "@/components/groups/group-admin-settings"
import Link from "next/link"

// --- Shadcn/ui & Lucide Imports ---
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, User, Crown, Eye, EyeOff, Settings, Info } from "lucide-react"

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
  
  // Helper to generate initials for AvatarFallback
  const getInitials = (uid: string) => {
    const displayName = getDisplayName(uid)
    const parts = displayName.split(/\s+/)
    if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return displayName[0]?.toUpperCase() || '?'
  }

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

      const userRef = ref(db, paths.userPublic(uid))
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


  // --- Render Section (Updated to use getDisplayName with Shadcn/ui) ---

  // Loading state placeholder
  if (!group) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-xl text-muted-foreground">Loading group info...</p>
        </div>
    )
  }

  // Determine member list for rendering
  const memberUids = Object.keys(members)
  const sortedMemberUids = memberUids.sort((a, b) => {
    // Admin first
    if (a === group.adminUid) return -1
    if (b === group.adminUid) return 1
    // Alphabetical otherwise
    return getDisplayName(a).localeCompare(getDisplayName(b))
  })
  
  return (
    <main className="container mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Group Header Card */}
      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl font-bold tracking-tight">
              {group?.name || "Group"}
            </CardTitle>
            <Badge variant={isMember ? "default" : "secondary"} className="text-sm px-3 py-1">
                {isMember ? "Member" : "Not Joined"}
            </Badge>
          </div>
          <CardDescription>
            {group?.description || "No description provided for this group."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Separator />
            
            {/* About Section - Admin & Discoverability */}
            <div className="flex flex-col space-y-3">
                <h2 className="flex items-center text-lg font-semibold text-gray-700 dark:text-gray-300">
                    <Info className="w-5 h-5 mr-2 text-primary" />
                    Details
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {/* Admin */}
                    <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">Admin:</span>
                        <Button variant="link" asChild className="p-0 h-auto">
                            <Link href={`/contact/${group?.adminUid}`} className="text-primary hover:underline">
                                {group?.adminUid ? getDisplayName(group.adminUid) : "Loading..."}
                            </Link>
                        </Button>
                    </div>

                    {/* Discoverability */}
                    <div className="flex items-center space-x-2">
                        {group?.discoverable ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                        <span className="font-medium text-gray-900 dark:text-gray-100">Discoverable:</span>
                        <Badge variant={group?.discoverable ? "default" : "destructive"}>
                            {group?.discoverable ? "Public" : "Private"}
                        </Badge>
                    </div>
                </div>
            </div>

        </CardContent>
      </Card>
      
      {/* Member List Section - Only visible to members */}
      {isMember && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
                <Users className="w-6 h-6 mr-2 text-primary" />
                Members ({memberUids.length})
            </CardTitle>
            <CardDescription>
                List of all members in the group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Use ScrollArea for a stable, contained member list */}
            <ScrollArea className="h-[250px] w-full rounded-md border p-4">
              <div className="space-y-3">
                {sortedMemberUids.map((uid) => (
                  <div key={uid} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{getInitials(uid)}</AvatarFallback>
                      </Avatar>
                      <span className="text-base font-medium">
                        <Link href={`/contact/${uid}`} className="text-foreground hover:text-primary transition-colors">
                            {getDisplayName(uid)}
                        </Link>
                      </span>
                    </div>
                    {/* Admin Tag */}
                    {uid === group.adminUid && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
                        <Crown className="w-3 h-3 mr-1" /> Admin
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Admin Settings Section - Only visible to the admin */}
      {isAdmin && (
        <Card className="shadow-lg border-2 border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl text-primary">
                <Settings className="w-6 h-6 mr-2" />
                Admin Settings
            </CardTitle>
            <CardDescription>
                Manage group properties and members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GroupAdminSettings groupId={groupId} />
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">Changes here affect the entire group.</p>
          </CardFooter>
        </Card>
      )}
    </main>
  )
}