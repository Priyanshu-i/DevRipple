"use client"

import { useParams } from "next/navigation"
import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref } from "firebase/database"
import { SubmitForm } from "@/components/solution/submit-form"

export default function SubmitSolutionPage() {
  const params = useParams<{ groupId: string }>()
  const groupId = params.groupId

  const { data: group } = useSWRSubscription(groupId ? `groups/${groupId}` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
    return () => unsub()
  })

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Submit Solution</h1>
      <p className="mb-4 text-sm text-muted-foreground">Group: {group?.name ?? groupId}</p>
      <SubmitForm groupId={groupId} todaysQuestionId={group?.todaysQuestionId ?? null} />
    </main>
  )
}
