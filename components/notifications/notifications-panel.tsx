"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { paths } from "@/lib/paths"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
// Assuming you have an icon component for the cross (e.g., Lucide's X or similar)
import { X } from "lucide-react" 
import { toast } from "@/hooks/use-toast"
import { onValue, ref, update } from "firebase/database"
import Link from "next/link" // Added Link for navigation

type Notification = {
  type: "join_request"
  groupId: string
  fromUid: string
  createdAt: number
  status: "pending" | "approved" | "denied"
}

type NameMap = {
  [id: string]: string
}

export function NotificationsPanel() {
  const [items, setItems] = useState<Record<string, Notification>>({})
  const [groupNames, setGroupNames] = useState<NameMap>({})
  const [userNames, setUserNames] = useState<NameMap>({})

  // Helper functions to get names, falling back to ID if name is loading
  const getGroupName = (gid: string) => groupNames[gid] || gid
  const getUserName = (uid: string) => userNames[uid] || uid

  // --- Effect 1: Fetch Notifications (Existing Logic) ---
  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const unsub = onValue(ref(db, paths.userNotifications(uid)), (snap) => {
      setItems(snap.val() || {})
    })
    return () => unsub()
  }, []) // Removed 'auth' from dependencies as it's static after initial load, keeping it clean

  // --- Effect 2: Fetch Group and User Names (Previous Logic) ---
  useEffect(() => {
    // 1. Collect all unique Group IDs and User UIDs
    const groupIdsToFetch = new Set<string>()
    const uidsToFetch = new Set<string>()
    
    Object.values(items).forEach(n => {
      if (n.type === "join_request") {
        groupIdsToFetch.add(n.groupId)
        uidsToFetch.add(n.fromUid)
      }
    })

    const listeners: (() => void)[] = []

    // 2. Fetch Group Names
    groupIdsToFetch.forEach(gid => {
      if (!groupNames[gid]) {
        const groupRef = ref(db, `groups/${gid}/name`)
        const listener = onValue(groupRef, (snap) => {
          const name = snap.val()
          setGroupNames(prev => ({ 
            ...prev, 
            [gid]: name || "Unknown Group"
          }))
        })
        listeners.push(listener)
      }
    })

    // 3. Fetch User Names
    uidsToFetch.forEach(uid => {
      if (!userNames[uid]) {
        const userRef = ref(db, `users/${uid}/displayName`)
        const listener = onValue(userRef, (snap) => {
          const name = snap.val()
          setUserNames(prev => ({ 
            ...prev, 
            [uid]: name || "Unknown User"
          }))
        })
        listeners.push(listener)
      }
    })

    return () => {
      listeners.forEach(unsub => unsub())
    }
  }, [items, groupNames, userNames]) 
  
  // --- NEW: Function to remove any notification ---
  const dismiss = async (id: string) => {
      const uid = auth.currentUser?.uid
      if (!uid) return
      
      try {
          // Set the notification item to null to remove it from the database
          const payload = {
              [`${paths.userNotifications(uid)}/${id}`]: null,
          }
          await update(ref(db), payload)
      } catch (e: any) {
          toast({ title: "Dismiss failed", description: e?.message, variant: "destructive" })
      }
  }

  // --- UPDATED: Action function (Approve/Deny) ---
  const act = async (id: string, n: Notification, action: "approved" | "denied") => {
    if (n.type !== "join_request" || n.status !== "pending") return // Only pending requests can be acted on
    const uid = auth.currentUser?.uid
    if (!uid) return

    try {
      const payload: any = {
        // Set the notification item to null to remove it after action
        [`${paths.userNotifications(uid)}/${id}`]: null, 
      }
      
      if (action === "approved") {
        // Only perform membership updates if approved
        payload[`${paths.groupMembers(n.groupId)}/${n.fromUid}`] = true
        payload[`${paths.userGroups(n.fromUid)}/${n.groupId}`] = { role: "member", joinedAt: Date.now() }
      }
      
      await update(ref(db), payload)
      toast({ title: `Request ${action}`, description: `User ${getUserName(n.fromUid)}'s request for ${getGroupName(n.groupId)} was ${action}.` })
    } catch (e: any) {
      toast({ title: "Action failed", description: e?.message, variant: "destructive" })
    }
  }

  const list = Object.entries(items).sort((a, b) => (b[1]?.createdAt || 0) - (a[1]?.createdAt || 0))

  return (
    // Added height constraint and overflow for proper handling of many notifications
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2"> 
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications</p>
      ) : (
        list.map(([id, n]) => (
          <Card key={id} className={`relative ${n.status !== 'pending' ? 'opacity-75' : ''}`}>
            
            {/* Dismiss Button (Cross Option) */}
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:bg-transparent"
                onClick={() => dismiss(id)}
                aria-label="Dismiss notification"
            >
                <X className="h-4 w-4" />
            </Button>

            <CardHeader className="pr-10 pb-2">
              <CardTitle className="text-base">
                Join request for <Link href={`/groups/${n.groupId}`} className="underline font-semibold">{getGroupName(n.groupId)}</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-sm">From user: <Link href={`/contact/${n.fromUid}`} className="underline">{getUserName(n.fromUid)}</Link></p>
              <p className="text-xs text-muted-foreground mt-1">
                Status: <span className={`font-medium ${n.status === 'pending' ? 'text-yellow-600' : n.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>{n.status}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Received: {new Date(n.createdAt).toLocaleString()}
              </p>
            </CardContent>
            {n.status === "pending" && (
                <CardFooter className="flex gap-2 pt-0">
                  <Button
                    size="sm"
                    onClick={() => act(id, n, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => act(id, n, "denied")}
                  >
                    Deny
                  </Button>
                </CardFooter>
            )}
          </Card>
        ))
      )}
    </div>
  )
}