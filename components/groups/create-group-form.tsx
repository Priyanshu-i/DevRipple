"use client"

import { useState } from "react"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { ref, push, set, serverTimestamp } from "firebase/database"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export function CreateGroupForm() {
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)

  if (!user) {
    return <div className="text-sm text-muted-foreground">Please sign in to create a group.</div>
  }

  async function onCreate() {
    if (!name.trim()) return
    const groupId = push(ref(db, "groups")).key!
    const inviteToken = Math.random().toString(36).slice(2, 10)
    await set(ref(db, `groups/${groupId}`), {
      id: groupId,
      name,
      description,
      isPublic,
      adminUid: user.uid,
      createdAt: serverTimestamp(),
      inviteToken,
    })
    // add creator as member
    await set(ref(db, `groupMembers/${groupId}/${user.uid}`), {
      role: "admin",
      joinedAt: serverTimestamp(),
    })
    // index
    await set(ref(db, `userGroups/${user.uid}/${groupId}`), true)
    window.location.href = `/groups/${groupId}`
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm">Group Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="flex items-center gap-2">
        <input id="isPublic" type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        <label htmlFor="isPublic" className="text-sm">
          Public group
        </label>
      </div>
      <div className="flex justify-end">
        <Button onClick={onCreate}>Create Group</Button>
      </div>
    </div>
  )
}
