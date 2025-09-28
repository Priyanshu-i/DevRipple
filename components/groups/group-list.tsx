"use client"

import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref } from "firebase/database"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

export function GroupList() {
  const { user } = useAuth()

  const { data: groups } = useSWRSubscription(user ? `userGroups/${user.uid}` : null, (key, { next }) => {
    if (!user) return
    const unsub = onValue(ref(db, key), (snap) => {
      const val = snap.val() || {}
      const ids = Object.keys(val)
      if (!ids.length) return next(null, [])
      let remaining = ids.length
      const res: Array<{ id: string; name: string }> = []
      ids.forEach((gid) => {
        onValue(
          ref(db, `groups/${gid}`),
          (s) => {
            const gv = s.val()
            if (gv) res.push({ id: gv.id, name: gv.name })
            remaining -= 1
            if (remaining === 0) next(null, res)
          },
          { onlyOnce: true },
        )
      })
    })
    return () => unsub()
  })

  if (!user) return <div className="text-sm text-muted-foreground">Sign in to see your groups.</div>

  return (
    <div className="space-y-2">
      {groups?.length ? (
        groups.map((g) => (
          <div key={g.id} className="rounded-md border p-3">
            <Link href={`/groups/${g.id}`} className="hover:underline">
              {g.name}
            </Link>
          </div>
        ))
      ) : (
        <div className="text-sm text-muted-foreground">You have no groups yet.</div>
      )}
    </div>
  )
}
