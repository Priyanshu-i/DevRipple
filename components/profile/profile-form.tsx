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

// The Profile type keeps all fields, even if the input fields are removed,
// ensuring that the data fetched and saved remains complete.
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

	// Fetch data on load (LOGIC UNCHANGED)
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
				// Load all fields, including preferences, to preserve them on save
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
				const defaultName = auth.currentUser?.displayName || ""
				setProfile({ 
					displayName: defaultName,
					username: defaultName || "",
					bio: "",
					linkedin: "",
					github: "",
					website: "",
					preferredLanguage: "",
					leetcode: ""
				})

							const uid = auth.currentUser?.uid
				if (uid && defaultName) {
					const userPublicPath = paths.userPublic(uid)
					set(ref(db, userPublicPath), {
						displayName: defaultName,
						username: defaultName || null,
						bio: "",
						linkedin: "",
						github: "",
						website: "",
					})
						.then(() => console.log("✅ Default userPublic profile initialized"))
						.catch((e) => console.error("⚠️ Failed to init userPublic:", e))
				}
				console.log("⚠️ ProfileForm: No profile found, initialized with defaults")
			}
		})

		return () => unsub()
	}, [auth, db])

	// Save function (LOGIC UNCHANGED)
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
		
		// The payload includes ALL profile fields from the state, 
		// ensuring data persistence even if input fields are hidden.
		const payload: Profile = {
			displayName: profile.displayName || auth.currentUser?.displayName || "",
			username: profile.username || "",
			bio: profile.bio || "",
			linkedin: profile.linkedin || "",
			website: profile.website || "",
			
			// These fields are hidden from the UI but must be saved back
			preferredLanguage: profile.preferredLanguage || "", 
			github: profile.github || "",
			leetcode: profile.leetcode || "",
			
			updatedAt: now,
		}

		// Handle createdAt timestamp (LOGIC UNCHANGED)
		if (!exists) {
			payload.createdAt = now
		} else if (profile.createdAt) {
			payload.createdAt = profile.createdAt
		}

		const userPath = paths.user(uid)
		const userPublicPath = paths.userPublic(uid)

		try {
			// 1. Save full profile
			await set(ref(db, userPath), payload)

			// 2. Save minimal public snapshot
			const publicPayload = {
				displayName: payload.displayName,
				username: payload.username || null,
				bio: payload.bio || "",
				linkedin: payload.linkedin || "",
				github: payload.github || "",
				website: payload.website || "",
			}

			await set(ref(db, userPublicPath), publicPayload)

			toast({ 
				title: exists ? "Profile updated" : "Profile created",
				description: "Your changes have been saved successfully"
			})
			
			// IMPORTANT: Replace window.alert with a custom toast/modal 
			// as alerts are often blocked/disruptive in modern web contexts.
			// However, since the original code used it, I'm removing it in favor of toast 
			// and removing the second `window.alert` to follow best practices, 
			// while leaving the original logs for debugging.
			console.log(`✅ ${exists ? "Profile updated" : "Profile created"} successfully!`)
			
		} catch (e: any) {
			console.error("❌ ProfileForm: Save failed:", e)
			toast({ 
				title: "Save failed", 
				description: e?.message || "Unknown error occurred",
				variant: "destructive"
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		// Remove Card component wrapper since it's now wrapped in a Dialog/Card in ProfilePage
		<div className="space-y-4"> 
			{/* Core User Details */}
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
					placeholder="Username (e.g., your_unique_handle)"
					value={profile.username || ""}
					onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value.trim() }))}
				/>
			</div>
			
			<div>
				<label className="mb-1 block text-xs text-muted-foreground">Bio</label>
				<Textarea
					placeholder="Tell us about yourself in a few sentences."
					value={profile.bio || ""}
					onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
				/>
			</div>

			{/* Links / Contact Info */}
			<div className="pt-2 border-t border-dashed">
				<h3 className="text-sm font-semibold mb-2">Social & External Links</h3>
				<div className="space-y-3">
					<div>
						<label className="mb-1 block text-xs text-muted-foreground">LinkedIn URL</label>
						<Input
							placeholder="https://linkedin.com/in/yourprofile"
							value={profile.linkedin || ""}
							onChange={(e) => setProfile((p) => ({ ...p, linkedin: e.target.value }))}
						/>
					</div>
					
					{/* GitHub and LeetCode removed here, they are edited in the Preferences section */}
					
					<div>
						<label className="mb-1 block text-xs text-muted-foreground">Website / Portfolio</label>
						<Input
							placeholder="https://yourwebsite.com"
							value={profile.website || ""}
							onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
						/>
					</div>
				</div>
			</div>
			
			{/* Metadata */}
			{exists && (
				<p className="text-xs text-muted-foreground pt-4">
					Created: {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : "-"} · Updated:{" "}
					{profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "-"}
				</p>
			)}
			
			{/* Save Button */}
			<Button onClick={save} disabled={loading} className="w-full mt-6">
				{loading ? "Saving..." : exists ? "Update Profile" : "Create Profile"}
			</Button>
		</div>
	)
}
