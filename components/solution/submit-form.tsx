"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import { ref, push, serverTimestamp, set } from "firebase/database"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CodeEditor } from "@/components/editor/code-editor"

type Props = {
  groupId: string
  todaysQuestionId?: string | null
}

const LANGS = ["python", "java", "cpp", "c", "javascript", "typescript"] as const

export function SubmitForm({ groupId, todaysQuestionId }: Props) {
  const { user } = useAuth()
  const [language, setLanguage] = useState<(typeof LANGS)[number]>("javascript")
  const [code, setCode] = useState("")
  const [approach, setApproach] = useState("")
  const [tc, setTc] = useState("")
  const [sc, setSc] = useState("")
  const [problemLink, setProblemLink] = useState("")
  const [tags, setTags] = useState<string>("")

  async function onSubmit() {
    if (!user) return
    if (!code.trim() || !approach.trim() || !tc.trim() || !sc.trim()) return

    const solutionId = push(ref(db, `solutions/${groupId}`)).key!
    const payload = {
      id: solutionId,
      groupId,
      code,
      language,
      approach,
      tc, // LaTeX string
      sc, // LaTeX string
      problemLink: problemLink || null,
      createdBy: user.uid,
      authorName: user.displayName ?? "Anonymous",
      createdAt: serverTimestamp(),
      upvotesCount: 0,
      tags: tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      todaysQuestionId: todaysQuestionId || null,
    }
    await set(ref(db, `solutions/${groupId}/${solutionId}`), payload)
    await set(ref(db, `solutions_global/${solutionId}`), payload)

    // Indexes for search
    await Promise.all([
      set(ref(db, `indexByAuthor/${user.uid}/${solutionId}`), true),
      set(ref(db, `indexByLanguage/${language}/${solutionId}`), true),
      ...payload.tags.map((t) => set(ref(db, `indexByTag/${t}/${solutionId}`), true)),
    ])
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="w-full rounded-md border bg-background p-2"
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm">Problem Link (optional)</label>
          <Input
            value={problemLink}
            onChange={(e) => setProblemLink(e.target.value)}
            placeholder="https://leetcode.com/problems/..."
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">Code</label>
        <CodeEditor value={code} onChange={setCode} language={language} placeholder="Write your solution..." />
      </div>

      <div>
        <label className="mb-1 block text-sm">Approach (Markdown allowed)</label>
        <Textarea value={approach} onChange={(e) => setApproach(e.target.value)} rows={5} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">Time Complexity (LaTeX)</label>
          <Input value={tc} onChange={(e) => setTc(e.target.value)} placeholder="e.g., O(n \\log n)" />
        </div>
        <div>
          <label className="mb-1 block text-sm">Space Complexity (LaTeX)</label>
          <Input value={sc} onChange={(e) => setSc(e.target.value)} placeholder="e.g., O(1)" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm">Tags (comma-separated)</label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., greedy, dp, two-pointers" />
      </div>

      <div className="flex justify-end">
        <Button onClick={onSubmit}>Submit Solution</Button>
      </div>
    </div>
  )
}
