"use client"

import { useAuth } from "@/hooks/use-auth"
import { GroupList, GroupCard } from "@/components/groups/group-list"
import Link from "next/link"
import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref, query, orderByChild, limitToLast } from "firebase/database"
import { JoinByCode } from "@/components/groups/join-by-code"
import { useState } from "react"
import { BasicModal } from "@/components/modals/basic-modal"

export default function DashboardPage() {
  const { user, signIn } = useAuth()
  const [joinOpen, setJoinOpen] = useState(false)

  const { data: recent } = useSWRSubscription(user ? "recentSolutions" : null, (key, { next }) => {
    if (!user) return
    const q = query(ref(db, `solutions_global`), orderByChild("createdAt"), limitToLast(10))
    const unsub = onValue(q, (snap) => {
      const val = snap.val() || {}
      const arr = Object.values(val) as any[]
      arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).reverse()
      next(null, arr)
    })
    return () => unsub()
  })

  const { data: myGroups } = useSWRSubscription(user ? `userGroups/${user.uid}` : null, (key, { next }) => {
    if (!user) return
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() || {}))
    return () => unsub()
  })

  const { data: allGroups } = useSWRSubscription(user ? `groups` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() || {}))
    return () => unsub()
  })

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/groups/new" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
          Create Group
        </Link>
      </div>

      {!user ? (
        <div className="rounded-md border p-6">
          <p className="mb-3">Sign in with Google to get started.</p>
          <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground" onClick={signIn}>
            Sign in
          </button>
        </div>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-medium">Your Groups</h2>
            <div className="mt-3">
              <GroupList />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-medium">Join a Group</h2>
            <div className="mt-3">
              <button
                className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                onClick={() => setJoinOpen(true)}
              >
                Join with Code
              </button>
              <BasicModal
                open={joinOpen}
                onOpenChange={setJoinOpen}
                title="Join with Group Code"
                description="Enter the code shared by the group admin."
              >
                <JoinByCode />
              </BasicModal>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-medium">You Can Join</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {allGroups
                ? Object.keys(allGroups)
                    .filter((gid) => allGroups[gid]?.discoverable && !(myGroups && myGroups[gid]))
                    .map((gid) => {
                      const g = allGroups[gid]
                      return (
                        <GroupCard
                          key={gid}
                          groupId={gid}
                          name={g.name}
                          description={g.description}
                          isMember={!!(myGroups && myGroups[gid])}
                          isAdmin={g.adminUid === user.uid}
                          discoverable={!!g.discoverable}
                          adminUid={g.adminUid}
                        />
                      )
                    })
                : null}
              {!allGroups ||
              !Object.keys(allGroups).some((gid) => allGroups[gid]?.discoverable && !(myGroups && myGroups[gid])) ? (
                <div className="text-sm text-muted-foreground">No discoverable groups right now.</div>
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium">Recent Activity</h2>
            <div className="mt-3 space-y-2">
              {recent?.length ? (
                recent.map((s: any) => (
                  <div key={s.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{s.authorName}</div>
                      <div className="text-xs text-muted-foreground">{s.language}</div>
                    </div>
                    <div className="text-muted-foreground">{s.problemLink || "Custom assignment"}</div>
                    <div className="mt-2">
                      <Link className="text-sm underline" href={`/groups/${s.groupId}`}>
                        View in group
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No recent activity yet.</div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
