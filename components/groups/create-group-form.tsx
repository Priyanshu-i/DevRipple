"use client"

import { useState } from "react"
import { db } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import { ref, push, set, serverTimestamp, get, child } from "firebase/database"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function CreateGroupForm() {
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [code, setCode] = useState("")
  const [discoverable, setDiscoverable] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!user) {
    return (
      <div className="text-sm text-muted-foreground">
        Please sign in to create a group.
      </div>
    )
  }

  async function onCreate() {
    if (!name.trim() || !user) return

    setLoading(true)
    setError("")

    try {
      // Check how many groups this user already created
      const userGroupsRef = ref(db, `groups`)
      const snapshot = await get(userGroupsRef)

      let createdCount = 0
      snapshot.forEach((childSnap) => {
        const group = childSnap.val()
        if (group.adminUid === user.uid) createdCount++
      })

      if (createdCount >= 2) {
        setError("You can only create up to 2 groups.")
        setLoading(false)
        return
      }

      // Proceed to create group
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
        code: code || null,
        discoverable,
      })

      await set(ref(db, `groupMembers/${groupId}/${user.uid}`), {
        role: "admin",
        joinedAt: serverTimestamp(),
      })

      await set(ref(db, `userGroups/${user.uid}/${groupId}`), true)

      window.location.href = `/groups/${groupId}`
    } catch (err) {
      console.error(err)
      setError("Failed to create group. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm">Group Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className="mb-1 block text-sm">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm">Group Code (optional)</label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g., ALPHA-1234"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Share this for instant joins. Keep it secret for private groups.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isPublic"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        <label htmlFor="isPublic" className="text-sm">
          Public group
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="discoverable"
          checked={discoverable}
          onCheckedChange={setDiscoverable}
        />
        <Label htmlFor="discoverable" className="text-sm">
          Discoverable
        </Label>
      </div>

      {error && (
        <p className="text-sm text-red-500 font-medium">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={onCreate} disabled={loading}>
          {loading ? "Creating..." : "Create Group"}
        </Button>
      </div>
    </div>
  )
}
