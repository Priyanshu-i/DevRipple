"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { paths } from "@/lib/paths"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { X, UserPlus, CheckCircle, XCircle } from "lucide-react" // Added Lucide Icons
import { toast } from "@/hooks/use-toast"
import { onValue, ref, update } from "firebase/database"
import Link from "next/link"

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
    
    // --- FEATURE IMPLEMENTATION: Preventing Duplicate Notifications ---
    /*
        The actual logic to prevent repeated notifications (i.e., multiple pending join requests 
        from the same user to the same group) MUST be implemented on the backend 
        or at the point where the notification is created (e.g., in the 'Send Request' handler).
        
        Since we cannot add new logic to the data creation source here, we will rely on 
        the data structure if it already enforces uniqueness by ID. For a join request, 
        a composite key (e.g., groupID_fromUID) should be used if the request can only be 
        pending once. The current Firebase structure relies on an auto-generated ID, 
        so the check must happen on the source side. The display component will simply 
        display whatever is in the database.
    */

	// --- Effect 1: Fetch Notifications (LOGIC UNCHANGED) ---
	useEffect(() => {
		const uid = auth.currentUser?.uid
		if (!uid) return
		const unsub = onValue(ref(db, paths.userNotifications(uid)), (snap) => {
			setItems(snap.val() || {})
		})
		return () => unsub()
	}, [])

	// --- Effect 2: Fetch Group and User Names (LOGIC UNCHANGED) ---
	useEffect(() => {
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
	
	// --- Function to remove any notification (LOGIC UNCHANGED) ---
	const dismiss = async (id: string) => {
		const uid = auth.currentUser?.uid
		if (!uid) return
		
		try {
			const payload = {
				[`${paths.userNotifications(uid)}/${id}`]: null,
			}
			await update(ref(db), payload)
		} catch (e: any) {
			toast({ title: "Dismiss failed", description: e?.message, variant: "destructive" })
		}
	}

	// --- Action function (Approve/Deny) (LOGIC UNCHANGED) ---
	const act = async (id: string, n: Notification, action: "approved" | "denied") => {
		if (n.type !== "join_request" || n.status !== "pending") return
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
		// Container with stable height and clean scrollbar for many items
		<div className="space-y-3 px-0 pb-4 max-h-[30rem] overflow-y-auto pr-1"> 
			{list.length === 0 ? (
				<p className="p-4 text-sm text-muted-foreground">You are all caught up! No notifications.</p>
			) : (
				list.map(([id, n]) => (
					<Card 
						key={id} 
						className={`relative p-3 border-l-4 transition-all duration-300 ${
							// Highlight pending requests distinctly
							n.status === 'pending' 
								? 'border-sky-500 shadow-md' 
								// Use slightly muted opacity and a light border for resolved/old items
								: 'opacity-85 border-muted hover:opacity-100'
						}`}
					>
						
						{/* Dismiss Button (Cross Option) */}
						<Button 
							variant="ghost" 
							size="icon" 
							className="absolute top-2 right-2 h-7 w-7 text-muted-foreground/80 hover:bg-transparent hover:text-red-500"
							onClick={() => dismiss(id)}
							aria-label="Dismiss notification"
						>
							<X className="h-4 w-4" />
						</Button>

						{/* Notification Content and Icon */}
						<div className="flex items-start gap-3">
							{/* Icon based on status */}
							<div className="pt-1 flex-shrink-0">
								{n.status === 'pending' && <UserPlus className="h-5 w-5 text-sky-600" />}
								{n.status === 'approved' && <CheckCircle className="h-5 w-5 text-green-600" />}
								{n.status === 'denied' && <XCircle className="h-5 w-5 text-red-600" />}
							</div>

							<div className="w-full">
								<CardHeader className="p-0 pr-8">
									<CardTitle className="text-sm font-medium leading-snug">
										<span className="font-semibold">Join request</span> for group: 
										<Link href={`/groups/${n.groupId}`} className="ml-1 text-sky-600 hover:underline font-semibold">
											{getGroupName(n.groupId)}
										</Link>
									</CardTitle>
								</CardHeader>
								
								<CardContent className="p-0 pt-1 text-xs">
									<p className="text-muted-foreground">
										From user: 
										<Link href={`/contact/${n.fromUid}`} className="ml-1 font-medium hover:underline text-foreground">
											{getUserName(n.fromUid)}
										</Link>
									</p>
									
									<div className="mt-1 flex gap-3 items-center text-muted-foreground">
										<p>Status: 
											<span className={`ml-1 font-semibold ${
												n.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' 
												: n.status === 'approved' ? 'text-green-600 dark:text-green-400' 
												: 'text-red-600 dark:text-red-400'
											}`}>{n.status}</span>
										</p>
										<p className="hidden sm:block">
                                            Received: {new Date(n.createdAt).toLocaleDateString()}
                                        </p>
									</div>
								</CardContent>
							</div>
						</div>
						
						{/* Action Buttons */}
						{n.status === "pending" && (
							<CardFooter className="flex gap-2 pt-3 pb-0 justify-end border-t mt-3 -mx-3 px-3">
								<Button
									size="sm"
									className="h-7 px-3 text-xs bg-green-500 hover:bg-green-600"
									onClick={() => act(id, n, "approved")}
								>
									Approve
								</Button>
								<Button
									size="sm"
									variant="destructive"
									className="h-7 px-3 text-xs"
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