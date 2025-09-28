"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getAuth } from "firebase/auth"
import { getDatabase, ref, onValue } from "firebase/database"
import { paths } from "@/lib/paths"
import { GroupAdminSettings } from "@/components/groups/group-admin-settings"

export function GroupInfoPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const auth = getAuth()
  const db = getDatabase()
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<Record<string, boolean>>({})
  const [isMember, setIsMember] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!groupId) return
    const unsub1 = onValue(ref(db, paths.group(groupId)), (snap) => setGroup(snap.val()))
    const unsub2 = onValue(ref(db, paths.groupMembers(groupId)), (snap) => setMembers(snap.val() || {}))
    return () => {
      unsub1()
      unsub2()
    }
  }, [db, groupId])

  useEffect(() => {
    if (!group) return
    const uid = auth.currentUser?.uid
    setIsAdmin(group.adminUid === uid)
    setIsMember(!!members[uid || ""])
  }, [group, members, auth])

  return (
    <main className="container mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{group?.name || "Group"}</h1>
        <p className="text-muted-foreground">{group?.description}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">About</h2>
        <p className="text-sm text-muted-foreground">Admin: {group?.adminUid}</p>
        <p className="text-sm text-muted-foreground">Discoverable: {group?.discoverable ? "Yes" : "No"}</p>
      </section>

      {isMember && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Members</h2>
          <ul className="list-disc pl-5">
            {Object.keys(members).map((uid) => (
              <li key={uid} className="text-sm">
                {uid}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Admin Settings</h2>
          <GroupAdminSettings groupId={groupId} />
        </section>
      )}
    </main>
  )
}
