"use client"

import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref } from "firebase/database"

export default function LeaderboardPage() {
  const since = Date.now() - 1000 * 60 * 60 * 24 * 30

  const { data: leaders } = useSWRSubscription("solutions_global", (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => {
      const val = snap.val() || {}
      const arr: any[] = Object.values(val)
      const byUser = new Map<string, { name: string; score: number }>()
      arr.forEach((s: any) => {
        const createdAt = typeof s.createdAt === "number" ? s.createdAt : 0
        if (createdAt < since) return
        const uid = s.createdBy
        const name = s.authorName || "Anonymous"
        const curr = byUser.get(uid) || { name, score: 0 }
        curr.score += s.upvotesCount || 0
        byUser.set(uid, curr)
      })
      const out = Array.from(byUser.entries()).map(([uid, v]) => ({ uid, ...v }))
      out.sort((a, b) => b.score - a.score)
      next(null, out.slice(0, 20))
    })
    return () => unsub()
  })

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Leaderboard (30 days)</h1>
      <div className="space-y-2">
        {leaders?.length ? (
          leaders.map((u: any, idx: number) => (
            <div key={u.uid} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <span className="mr-3 font-mono">#{idx + 1}</span>
                <span className="font-medium">{u.name}</span>
              </div>
              <div className="text-sm text-muted-foreground">Upvotes: {u.score}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No data yet.</div>
        )}
      </div>
    </main>
  )
}
