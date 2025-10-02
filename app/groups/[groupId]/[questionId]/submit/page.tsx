"use client"

import { useParams, useRouter } from "next/navigation"
import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref } from "firebase/database"
import { SubmitForm } from "@/components/solution/submit-form"
import { paths } from "@/lib/paths"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SubmitSolutionPage() {
  const params = useParams<{ groupId: string; questionId: string }>()
  const { groupId, questionId } = params
  const router = useRouter()

  if (!groupId || !questionId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Error</h1>
        <p>Invalid group or question ID in URL. Navigation might be missing parameters.</p>
      </main>
    )
  }

  const { data: group } = useSWRSubscription(groupId ? paths.group(groupId) : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
    return () => unsub()
  })

  // --- Redirect handler passed to SubmitForm ---
  const handleRedirect = () => {
    router.push(`/groups/${groupId}/${questionId}`)
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Go Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        onClick={handleRedirect}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Question
      </Button>

      <h1 className="mb-4 text-2xl font-semibold">Submit Solution</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Group: {group?.name ?? groupId} | Submitting for Question ID: <span className="font-mono">{questionId}</span>
      </p>

      {/* Pass redirect callback to SubmitForm */}
      <SubmitForm groupId={groupId} questionId={questionId} />
    </main>
  )
}