"use client"

import { useParams } from "next/navigation"
import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref } from "firebase/database"
import { SubmitForm } from "@/components/solution/submit-form"
import { paths } from "@/lib/paths"

export default function SubmitSolutionPage() {
  const params = useParams<{ groupId: string; questionId: string }>()
  const { groupId, questionId } = params

  if (!groupId || !questionId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Error</h1>
        <p>Invalid group or question ID in URL. Navigation might be missing parameters.</p>
      </main>
    )
  }

  // Still fetching group details for the display title
  const { data: group } = useSWRSubscription(groupId ? paths.group(groupId) : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
    return () => unsub()
  })

  // --- LOGIC REMOVED ---
  // We no longer attempt to find a 'latest' question ID because this page is
  // explicitly for the question ID found in the URL params.

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Submit Solution</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Group: {group?.name ?? groupId} | Submitting for Question ID: <span className="font-mono">{questionId}</span>
      </p>
      {/* CRITICAL CHANGE: Pass the questionId directly from the URL params.
        We also ensure it's a string, as the SubmitForm is now expecting a string. 
      */}
      <SubmitForm groupId={groupId} questionId={questionId} />
    </main>
  )
}
