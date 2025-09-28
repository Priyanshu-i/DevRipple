"use client"

import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import useSWRSubscription from "swr/subscription"
import { onValue, ref, update } from "firebase/database"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: profile } = useSWRSubscription(user ? `users/${user.uid}` : null, (key, { next }) => {
    if (!user) return
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
    return () => unsub()
  })

  const { data: userGroups } = useSWRSubscription(user ? `userGroups/${user.uid}` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() || {}))
    return () => unsub()
  })

  const { data: authoredIndex } = useSWRSubscription(user ? `indexByAuthor/${user.uid}` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() || {}))
    return () => unsub()
  })

  const [language, setLanguage] = useState(profile?.preferredLanguage ?? "")
  const [github, setGithub] = useState(profile?.github ?? "")
  const [leetcode, setLeetcode] = useState(profile?.leetcode ?? "")

  useEffect(() => {
    if (profile) {
      setLanguage(profile.preferredLanguage ?? "")
      setGithub(profile.github ?? "")
      setLeetcode(profile.leetcode ?? "")
    }
  }, [profile])

  if (!user) return <main className="mx-auto max-w-3xl px-4 py-8">Sign in to view your profile.</main>

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Profile</h1>

      <div className="mb-6 flex items-center gap-4">
        <img
          src={user.photoURL || "/placeholder-user.jpg"}
          alt="User avatar"
          className="h-12 w-12 rounded-full border object-cover"
        />
        <div>
          <div className="text-base font-medium">{user.displayName || "Anonymous"}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-md border p-4">
          <div className="mb-3 text-sm font-medium">Preferences</div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">Preferred Language</label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g., C++, Python" />
            </div>
            <div>
              <label className="mb-1 block text-sm">GitHub URL</label>
              <Input
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/yourname"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">LeetCode URL</label>
              <Input
                value={leetcode}
                onChange={(e) => setLeetcode(e.target.value)}
                placeholder="https://leetcode.com/yourname"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  if (!user) return
                  await update(ref(db, `users/${user.uid}`), { preferredLanguage: language, github, leetcode })
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-md border p-4">
            <div className="mb-3 text-sm font-medium">Your Groups</div>
            {userGroups && Object.keys(userGroups).length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {Object.keys(userGroups).map((gid) => (
                  <li key={gid}>
                    <a href={`/groups/${gid}`} className="underline">
                      {gid}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">No groups yet.</div>
            )}
          </div>

          <div className="rounded-md border p-4">
            <div className="mb-3 text-sm font-medium">Your Submissions</div>
            {authoredIndex && Object.keys(authoredIndex).length ? (
              <ul className="space-y-2">
                {Object.keys(authoredIndex)
                  .slice(0, 5)
                  .map((sid) => (
                    <li key={sid} className="text-sm">
                      <a href={`/search?solution=${sid}`} className="underline">
                        {sid}
                      </a>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">No submissions yet.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
