"use client"

import { useParams } from "next/navigation"
import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref } from "firebase/database"
import { SubmitForm } from "@/components/solution/submit-form"
import { paths } from "@/lib/paths"

export default function SubmitSolutionPage() {
  const params = useParams<{ groupId: string }>()
  const groupId = params.groupId

  const { data: group } = useSWRSubscription(groupId ? `groups/${groupId}` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
    return () => unsub()
  })

  // Resolve latest valid questionId (by createdAt, not expired)
  const { data: questions } = useSWRSubscription(
    groupId ? paths.groupQuestionsCollection(groupId) : null,
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() || {}))
      return () => unsub()
    }
  )

  let latestQuestionId: string | null | undefined = undefined
  if (questions) {
    const now = Date.now()
    const arr = Object.entries(questions).map(([id, q]: any) => ({ id, ...(q || {}) }))
    const valid = arr.filter((q: any) => !q.expiresAt || q.expiresAt > now)
    if (valid.length === 0) latestQuestionId = null
    else {
      valid.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      latestQuestionId = valid[0].id
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Submit Solution</h1>
      <p className="mb-4 text-sm text-muted-foreground">Group: {group?.name ?? groupId}</p>
      <SubmitForm groupId={groupId} questionId={latestQuestionId ?? null} />
    </main>
  )
}
