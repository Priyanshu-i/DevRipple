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
  preferredLanguage?: string
  leetcode?: string
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
    if (!uid) {
      console.log("⚠️ ProfileForm: No authenticated user")
      return
    }

    const userPath = paths.user(uid)
    console.log("📊 ProfileForm: Subscribing to user data at:", userPath)

    const unsub = onValue(ref(db, userPath), (snap) => {
      const v = snap.val()
      console.log("📊 ProfileForm: Received user data:", v)

      if (v) {
        setExists(true)
        setProfile({
          displayName: v.displayName || "",
          username: v.username || "",
          bio: v.bio || "",
          linkedin: v.linkedin || "",
          github: v.github || "",
          website: v.website || "",
          preferredLanguage: v.preferredLanguage || "",
          leetcode: v.leetcode || "",
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })
        console.log("✅ ProfileForm: Profile exists, loaded data")
      } else {
        setExists(false)
        setProfile({ 
          displayName: auth.currentUser?.displayName || "",
          username: "",
          bio: "",
          linkedin: "",
          github: "",
          website: "",
          preferredLanguage: "",
          leetcode: ""
        })
        console.log("⚠️ ProfileForm: No profile found, initialized with defaults")
      }
    })

    return () => unsub()
  }, [auth, db])

  const save = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      console.error("❌ ProfileForm: Cannot save - no user authenticated")
      toast({ 
        title: "Authentication required", 
        description: "Please sign in to save your profile",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    const now = Date.now()
    
    const payload: any = {
      displayName: profile.displayName || auth.currentUser?.displayName || "",
      username: profile.username || "",
      bio: profile.bio || "",
      linkedin: profile.linkedin || "",
      github: profile.github || "",
      website: profile.website || "",
      preferredLanguage: profile.preferredLanguage || "",
      leetcode: profile.leetcode || "",
      updatedAt: now,
    }

    // Only add createdAt if it's a new profile
    if (!exists) {
      payload.createdAt = now
    } else if (profile.createdAt) {
      // Preserve existing createdAt for updates
      payload.createdAt = profile.createdAt
    }

    const userPath = paths.user(uid)
    const userPublicPath = paths.userPublic(uid)

    console.log("💾 ProfileForm: Saving to:", userPath)
    console.log("💾 ProfileForm: Payload:", payload)

    try {
      // Save full profile to users/{uid}
      await set(ref(db, userPath), payload)
      console.log("✅ ProfileForm: Main profile saved successfully")

      // Save minimal public snapshot for contact pages
      const publicPayload = {
        displayName: payload.displayName,
        username: payload.username || null,
        bio: payload.bio || "",
        linkedin: payload.linkedin || "",
        github: payload.github || "",
        website: payload.website || "",
      }

      console.log("💾 ProfileForm: Saving public profile to:", userPublicPath)
      console.log("💾 ProfileForm: Public payload:", publicPayload)

      await set(ref(db, userPublicPath), publicPayload)
      console.log("✅ ProfileForm: Public profile saved successfully")

      toast({ 
        title: exists ? "Profile updated" : "Profile created",
        description: "Your changes have been saved successfully"
      })
      
      window.alert(`✅ ${exists ? "Profile updated" : "Profile created"} successfully!`)
      
    } catch (e: any) {
      console.error("❌ ProfileForm: Save failed:", e)
      toast({ 
        title: "Save failed", 
        description: e?.message || "Unknown error occurred",
        variant: "destructive"
      })
      window.alert(`❌ Failed to save profile:\n${e?.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pretty">
          {exists ? "Edit Profile" : "Create Profile"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Display Name</label>
          <Input
            placeholder="Display Name"
            value={profile.displayName}
            onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
          />
        </div>
        
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Username (optional)</label>
          <Input
            placeholder="Username"
            value={profile.username || ""}
            onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value.trim() }))}
          />
        </div>
        
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Bio</label>
          <Textarea
            placeholder="Tell us about yourself..."
            value={profile.bio || ""}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
          />
        </div>
        
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">LinkedIn URL</label>
          <Input
            placeholder="https://linkedin.com/in/yourprofile"
            value={profile.linkedin || ""}
            onChange={(e) => setProfile((p) => ({ ...p, linkedin: e.target.value }))}
          />
        </div>
        
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">GitHub URL</label>
          <Input
            placeholder="https://github.com/yourusername"
            value={profile.github || ""}
            onChange={(e) => setProfile((p) => ({ ...p, github: e.target.value }))}
          />
        </div>
        
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Website</label>
          <Input
            placeholder="https://yourwebsite.com"
            value={profile.website || ""}
            onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Preferred Language</label>
          <Input
            placeholder="e.g., Python, JavaScript, C++"
            value={profile.preferredLanguage || ""}
            onChange={(e) => setProfile((p) => ({ ...p, preferredLanguage: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">LeetCode URL</label>
          <Input
            placeholder="https://leetcode.com/yourusername"
            value={profile.leetcode || ""}
            onChange={(e) => setProfile((p) => ({ ...p, leetcode: e.target.value }))}
          />
        </div>
        
        {exists && (
          <p className="text-xs text-muted-foreground">
            Created: {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : "-"} · Updated:{" "}
            {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "-"}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={save} disabled={loading} className="w-full">
          {loading ? "Saving..." : exists ? "Update Profile" : "Create Profile"}
        </Button>
      </CardFooter>
    </Card>
  )
}