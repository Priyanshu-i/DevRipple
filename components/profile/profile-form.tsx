"use client"

import { useEffect, useState } from "react"
import { getAuth } from "firebase/auth"
import { getDatabase, ref, onValue, set } from "firebase/database"
import { paths } from "@/lib/paths"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

type Profile = {
  displayName: string
  username?: string
  bio?: string
  linkedin?: string
  github?: string
  website?: string
  createdAt?: number
  updatedAt?: number
}

export function ProfileForm() {
  const auth = getAuth()
  const db = getDatabase()
  const [profile, setProfile] = useState<Profile>({ displayName: "" })
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const unsub = onValue(ref(db, paths.user(uid)), (snap) => {
      const v = snap.val()
      if (v) {
        setExists(true)
        setProfile({
          displayName: v.displayName || "",
          username: v.username || "",
          bio: v.bio || "",
          linkedin: v.linkedin || "",
          github: v.github || "",
          website: v.website || "",
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })
      } else {
        setExists(false)
        setProfile({ displayName: auth.currentUser?.displayName || "" })
      }
    })
    return () => unsub()
  }, [auth, db])

  const save = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    setLoading(true)
    try {
      const now = Date.now()
      const payload = {
        ...profile,
        displayName: profile.displayName || auth.currentUser?.displayName || "",
        updatedAt: now,
        ...(exists ? {} : { createdAt: now }),
      }
      await set(ref(db, paths.user(uid)), payload)
      // write minimal public snapshot for contact pages
      await set(ref(db, paths.userPublic(uid)), {
        displayName: payload.displayName,
        username: payload.username || null,
        bio: payload.bio || "",
        linkedin: profile.linkedin || "",
        github: profile.github || "",
        website: profile.website || "",
      })
      toast({ title: exists ? "Profile updated" : "Profile created" })
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pretty">{exists ? "Edit Profile" : "Create Profile"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Display Name"
          value={profile.displayName}
          onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
        />
        <Input
          placeholder="Username (optional)"
          value={profile.username || ""}
          onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value.trim() }))}
        />
        <Textarea
          placeholder="Bio"
          value={profile.bio || ""}
          onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
        />
        <Input
          placeholder="LinkedIn URL"
          value={profile.linkedin || ""}
          onChange={(e) => setProfile((p) => ({ ...p, linkedin: e.target.value }))}
        />
        <Input
          placeholder="GitHub URL"
          value={profile.github || ""}
          onChange={(e) => setProfile((p) => ({ ...p, github: e.target.value }))}
        />
        <Input
          placeholder="Website"
          value={profile.website || ""}
          onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
        />
        {exists && (
          <p className="text-xs text-muted-foreground">
            Created: {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : "-"} · Updated:{" "}
            {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "-"}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={save} disabled={loading}>
          {loading ? "Saving..." : exists ? "Update Profile" : "Create Profile"}
        </Button>
      </CardFooter>
    </Card>
  )
}
