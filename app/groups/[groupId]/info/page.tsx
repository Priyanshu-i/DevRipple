"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import { getAuth } from "firebase/auth"
import { getDatabase, ref, onValue, set, remove } from "firebase/database"
import { paths } from "@/lib/paths"
import { GroupAdminSettings } from "@/components/groups/group-admin-settings"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Users, User, Crown, Eye, EyeOff, Settings, Info, ShieldCheck, UserX, ShieldOff, Search } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface UserProfile {
  displayName: string
}

export default function GroupInfoPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const auth = getAuth()
  const db = getDatabase()
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<Record<string, boolean>>({})
  const [secondaryAdmins, setSecondaryAdmins] = useState<Record<string, boolean>>({})
  const [isMember, setIsMember] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSecondaryAdmin, setIsSecondaryAdmin] = useState(false)
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [toggleAdminUserId, setToggleAdminUserId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const getDisplayName = useCallback((uid: string) => {
    // Prioritize displayName, then username, then fallback to 'User'
    return userProfiles[uid]?.displayName ||  'User'
  }, [userProfiles])
  
  const getInitials = (uid: string) => {
    const displayName = getDisplayName(uid)
    
    // Handle "User" fallback case
    if (displayName === 'User') {
        return 'U'
    }
    
    const parts = displayName.split(/\s+/).filter(Boolean) // Filter out empty strings
    
    if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    
    return displayName[0]?.toUpperCase() || 'U'
  }

  // --- All useEffect hooks must remain at the top level ---
  useEffect(() => {
    if (!groupId) return
    const unsub1 = onValue(ref(db, paths.group(groupId)), (snap) => setGroup(snap.val()))
    const unsub2 = onValue(ref(db, paths.groupMembers(groupId)), (snap) => setMembers(snap.val() || {}))
    const unsub3 = onValue(ref(db, paths.groupSecondaryAdmins(groupId)), (snap) => setSecondaryAdmins(snap.val() || {}))
    return () => {
      unsub1()
      unsub2()
      unsub3()
    }
  }, [db, groupId])

  useEffect(() => {
    if (!group) return
    const uid = auth.currentUser?.uid
    setIsAdmin(group.adminUid === uid)
    setIsSecondaryAdmin(!!secondaryAdmins[uid || ""])
    setIsMember(!!members[uid || ""])
  }, [group, members, secondaryAdmins, auth])

  useEffect(() => {
    const uidsToFetch = new Set<string>()
    if (group?.adminUid) {
      uidsToFetch.add(group.adminUid)
    }
    Object.keys(members).forEach(uid => uidsToFetch.add(uid))

    if (uidsToFetch.size === 0) return

    const listeners: (() => void)[] = []

    uidsToFetch.forEach(uid => {
      if (userProfiles[uid]) return

      const userRef = ref(db, paths.userPublic(uid))
      const listener = onValue(userRef, (snap) => {
        const v = snap.val()
        if (v) {
          setUserProfiles(prev => ({
            ...prev,
            [uid]: { displayName: v.displayName || v.username || "No Name" },
          }))
        }
      })
      listeners.push(listener)
    })

    return () => {
      listeners.forEach(unsub => unsub())
    }
  }, [db, group, members, userProfiles])
  // --- End of useEffect hooks ---


  const handleDeleteUser = async (uid: string) => {
    if (!groupId || isProcessing) return
    
    setIsProcessing(true)
    try {
      await remove(ref(db, paths.groupMember(groupId, uid)))
      await remove(ref(db, paths.groupSecondaryAdmin(groupId, uid)))
      
      const userGroupRef = ref(db, `${paths.userGroups(uid)}/${groupId}`)
      await remove(userGroupRef)
      
      toast.success(`${getDisplayName(uid)} has been removed from the group`)
      setDeleteUserId(null)
    } catch (error) {
      console.error("Error removing user:", error)
      toast.error("Failed to remove user from group")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleToggleSecondaryAdmin = async (uid: string) => {
    if (!groupId || isProcessing) return
    
    setIsProcessing(true)
    try {
      const isCurrentlyAdmin = secondaryAdmins[uid]
      
      if (isCurrentlyAdmin) {
        await remove(ref(db, paths.groupSecondaryAdmin(groupId, uid)))
        toast.success(`${getDisplayName(uid)} is no longer a secondary admin`)
      } else {
        await set(ref(db, paths.groupSecondaryAdmin(groupId, uid)), true)
        toast.success(`${getDisplayName(uid)} is now a secondary admin`)
      }
      
      setToggleAdminUserId(null)
    } catch (error) {
      console.error("Error toggling secondary admin:", error)
      toast.error("Failed to update admin status")
    } finally {
      setIsProcessing(false)
    }
  }

  const memberUids = Object.keys(members)
  const canManageMembers = isAdmin || isSecondaryAdmin

  // 🚨 CORRECT HOOK PLACEMENT: Use hooks before the conditional return 
  const filteredAndSortedMemberUids = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()

    // 1. Filter members based on search term (display name)
    const filteredUids = memberUids.filter(uid => {
      if (!term) return true // Show all if no search term
      const displayName = getDisplayName(uid).toLowerCase()
      // Check if display name includes the search term
      return displayName.includes(term)
    })

    // 2. Sort the filtered members
    const sortedUids = filteredUids.sort((a, b) => {
      // Primary admin always first, regardless of filter
      if (a === group?.adminUid) return -1 // Use group?.adminUid since group might be null here
      if (b === group?.adminUid) return 1
      // Sort by display name
      return getDisplayName(a).localeCompare(getDisplayName(b))
    })

    return sortedUids
  }, [memberUids, searchTerm, group?.adminUid, getDisplayName]) // Group is correctly accessed with optional chaining here


  // Conditional Return (must come AFTER all hooks)
  if (!group) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-xl text-muted-foreground">Loading group info...</p>
        </div>
    )
  }
  
  return (
    <main className="container mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      <Card className="shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl font-bold tracking-tight">
              {group?.name || "Group"}
            </CardTitle>
            <Badge variant={isMember ? "default" : "secondary"} className="text-sm px-3 py-1">
                {isAdmin ? "Admin" : isSecondaryAdmin ? "Secondary Admin" : isMember ? "Member" : "Not Joined"}
            </Badge>
          </div>
          <CardDescription>
            {group?.description || "No description provided for this group."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Separator />
            
            <div className="flex flex-col space-y-3">
                <h2 className="flex items-center text-lg font-semibold text-gray-700 dark:text-gray-300">
                    <Info className="w-5 h-5 mr-2 text-primary" />
                    Details
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">Admin:</span>
                        <Button variant="link" asChild className="p-0 h-auto">
                            <Link href={`/contact/${group?.adminUid}`} className="text-primary hover:underline">
                                {group?.adminUid ? getDisplayName(group.adminUid) : "Loading..."}
                            </Link>
                        </Button>
                    </div>

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
      
      {isMember && (
        <Card className="shadow-lg">
          <CardHeader>
            {/* Modified CardTitle to include search and use flex for spacing */}
            <div className="flex items-start justify-between">
                <CardTitle className="flex items-center text-2xl mt-1">
                    <Users className="w-6 h-6 mr-2 text-primary" />
                    Members ({memberUids.length})
                </CardTitle>
                {/* Search Input field */}
                <div className="relative w-1/3 min-w-[150px]">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>
            
            <CardDescription>
                List of all members in the group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px] w-full rounded-md border p-4">
              <div className="space-y-3">
                {/* Use the filtered and sorted array here */}
                {filteredAndSortedMemberUids.length > 0 ? (
                    filteredAndSortedMemberUids.map((uid) => {
                      const isSecAdmin = secondaryAdmins[uid]
                      const isPrimaryAdmin = uid === group.adminUid
                      const currentUserUid = auth.currentUser?.uid
                      
                      return (
                        <div key={uid} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>{getInitials(uid)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-base font-medium">
                                <Link href={`/contact/${uid}`} className="text-foreground hover:text-primary transition-colors">
                                    {getDisplayName(uid)}
                                </Link>
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isPrimaryAdmin && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
                                <Crown className="w-3 h-3 mr-1" /> Admin
                              </Badge>
                            )}
                            
                            {!isPrimaryAdmin && isSecAdmin && (
                              <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/20">
                                <ShieldCheck className="w-3 h-3 mr-1" /> Sec-Admin
                              </Badge>
                            )}
                            
                            {canManageMembers && !isPrimaryAdmin && uid !== currentUserUid && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setToggleAdminUserId(uid)}
                                  disabled={isProcessing}
                                >
                                  {isSecAdmin ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteUserId(uid)}
                                  disabled={isProcessing}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                ) : (
                    <p className="text-center text-muted-foreground py-4">
                        {searchTerm ? "No members found matching your search." : "No members in this group."}
                    </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

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

      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteUserId && getDisplayName(deleteUserId)} from this group? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && handleDeleteUser(deleteUserId)}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toggleAdminUserId} onOpenChange={(open) => !open && setToggleAdminUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleAdminUserId && secondaryAdmins[toggleAdminUserId] ? "Remove Secondary Admin" : "Make Secondary Admin"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleAdminUserId && secondaryAdmins[toggleAdminUserId]
                ? `Remove admin privileges from ${getDisplayName(toggleAdminUserId)}? They will remain a member but lose admin access.`
                : `Grant admin privileges to ${toggleAdminUserId && getDisplayName(toggleAdminUserId)}? They will be able to manage members and settings.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleAdminUserId && handleToggleSecondaryAdmin(toggleAdminUserId)}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}