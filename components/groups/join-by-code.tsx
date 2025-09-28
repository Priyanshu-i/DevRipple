"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { ref, get, update } from "firebase/database"
import { auth, db } from "@/lib/firebase"
import { paths } from "@/lib/paths"

export function JoinByCode() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    const user = auth.currentUser
    if (!user) {
      toast({ title: "Please sign in to join a group" })
      return
    }
    if (!code.trim()) return
    setLoading(true)
    try {
      // find group by code (scan groups; in production keep an index groupsByCode)
      const groupsSnap = await get(ref(db, paths.groups()))
      const groups = groupsSnap.val() || {}
      let targetId: string | null = null
      for (const gid of Object.keys(groups)) {
        if (groups[gid]?.code === code.trim()) {
          targetId = gid
          break
        }
      }
      if (!targetId) {
        toast({ title: "Invalid group code" })
        return
      }
      // add membership
      const uid = user.uid
      await update(ref(db), {
        [`${paths.groupMembers(targetId)}/${uid}`]: true,
        [`${paths.userGroups(uid)}/${targetId}`]: { role: "member", joinedAt: Date.now() },
      })
      toast({ title: "Joined group!" })
      setCode("")
    } catch (err: any) {
      toast({ title: "Failed to join", description: err?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Enter group code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="max-w-xs"
      />
      <Button onClick={handleJoin} disabled={loading}>
        {loading ? "Joining..." : "Join"}
      </Button>
    </div>
  )
}
