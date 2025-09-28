"use client"

import { useMemo, useState } from "react"
import { getDatabase, ref, onValue, push, set, get, update } from "firebase/database"
import { paths } from "@/lib/paths"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type Props = {
  groupId: string
  isAdmin: boolean
}

export function TodaysQuestion({ groupId, isAdmin }: Props) {
  const db = getDatabase()
  const [value, setValue] = useState("")
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // subscribe current question id and value
  useMemo(() => {
    const qIdRef = ref(db, paths.todaysQuestionId(groupId))
    const unsub = onValue(qIdRef, async (snap) => {
      const qid = snap.val()
      setCurrentId(qid || null)
      if (qid) {
        const snapQ = await get(ref(db, `${paths.groupQuestions(groupId)}/${qid}`))
        const q = snapQ.val()
        setValue(q?.content || "")
      } else {
        setValue("")
      }
    })
    return () => unsub()
  }, [db, groupId])

  const saveQuestion = async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      let qid = currentId
      if (!qid) {
        qid = push(ref(db, paths.groupQuestions(groupId))).key as string
      }
      await set(ref(db, `${paths.groupQuestions(groupId)}/${qid}`), {
        content: value,
        updatedAt: Date.now(),
      })
      await update(ref(db), { [paths.todaysQuestionId(groupId)]: qid })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Today's Question</h3>
        {isAdmin && (
          <Button onClick={saveQuestion} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        )}
      </div>
      {isAdmin ? (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write the problem statement (Markdown supported)"
          className="min-h-40"
        />
      ) : (
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || "No question posted yet."}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
