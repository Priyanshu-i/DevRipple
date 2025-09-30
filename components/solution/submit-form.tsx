"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import { ref, push, serverTimestamp, set, update } from "firebase/database"
import { paths } from "@/lib/paths"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CodeEditor } from "@/components/editor/code-editor"

type Props = {
  groupId: string
  questionId?: string | null
}

const LANGS = ["python", "java", "cpp", "c", "javascript", "typescript"] as const

export function SubmitForm({ groupId, questionId }: Props) {
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

    const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    const qid = questionId || "unassigned"
    const solutionId = push(ref(db, paths.solutionsEphemeral(groupId, qid))).key!

    const payload = {
      id: solutionId,
      groupId,
      questionId: qid,
      code,
      language,
      approach,
      tc,
      sc,
      problemLink: problemLink || null,
      createdBy: user.uid,
      authorName: user.displayName ?? "Anonymous",
      createdAt: Date.now(),
      serverCreatedAt: serverTimestamp(),
      upvotesCount: 0,
      tags: tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      todaysQuestionId: qid,
      expiresAt,
      source: "ephemeral",
    }

    // Write under canonical ephemeral path
    await set(ref(db, paths.solutionEphemeralDoc(groupId, qid, solutionId)), payload)

    await update(ref(db), {
      [`solutions_global/${solutionId}`]: {
        id: solutionId,
        groupId,
        questionId: qid,
        authorName: payload.authorName,
        language: payload.language,
        problemLink: payload.problemLink || null,
        createdAt: payload.createdAt,
      },
    })

    await Promise.all([
      set(ref(db, `indexByAuthor/${user.uid}/${solutionId}`), true),
      set(ref(db, `indexByLanguage/${language}/${solutionId}`), true),
      ...payload.tags.map((t) => set(ref(db, `indexByTag/${t}/${solutionId}`), true)),
      set(ref(db, `groupStats/${groupId}/${user.uid}`), {
        lastSubmissionAt: payload.createdAt,
        submissions: /* merged server-side via R/W */ 0,
      }),
      set(ref(db, `userStats/${user.uid}/${groupId}`), {
        lastSubmissionAt: payload.createdAt,
        submissions: /* merged server-side via R/W */ 0,
      }),
    ])

    try {
      const keyNew = `devripple_submissions_${groupId}`
      const keyCompat = `devripple_submissions/${groupId}`
      const arrNew = JSON.parse(localStorage.getItem(keyNew) || "[]")
      const arrCompat = JSON.parse(localStorage.getItem(keyCompat) || "[]")
      arrNew.unshift(payload)
      arrCompat.unshift(payload)
      localStorage.setItem(keyNew, JSON.stringify(arrNew.slice(0, 200)))
      localStorage.setItem(keyCompat, JSON.stringify(arrCompat.slice(0, 200)))
    } catch {}
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
