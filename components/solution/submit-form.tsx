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
  questionId?: string | null // Can be null if no valid question is available
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  
  async function onSubmit() {
    if (!user) {
      setError("You must be logged in to submit a solution.")
      return
    }
    // Note: If questionId is null, solutions will be stored under 'unassigned' question collection.
    if (!questionId) {
        setError("Cannot submit: No question ID is available.")
        return
    }
    if (!code.trim() || !approach.trim() || !tc.trim() || !sc.trim()) {
      setError("Code, Approach, Time Complexity, and Space Complexity are required.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours visibility
      const qid = questionId // Guaranteed to be non-null by the check above
      
      // 1. Get a reference to the solutions collection for this specific question
      const solutionsCollectionRef = ref(db, paths.solutionsCollection(groupId, qid))
      
      // 2. Use push on the COLLECTION reference to generate a new key
      const solutionId = push(solutionsCollectionRef).key!

      const tagsArray = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

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
        createdAt: Date.now(), // Client timestamp for sorting accuracy
        serverCreatedAt: serverTimestamp(), // Server timestamp for reliable time
        upvotesCount: 0,
        tags: tagsArray,
        expiresAt,
        source: "ephemeral",
      }

      // 3. Use the correct DOCUMENT path for setting the solution data
      const solutionDocPath = paths.solutionDocument(groupId, qid, solutionId)
      await set(ref(db, solutionDocPath), payload)

      // 4. Update global/index documents (no change here, paths are correct)
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

      // 5. Update indices and stats (no change here, paths are correct)
      const submissionTime = payload.createdAt

      const updates: { [key: string]: any } = {
        // Index by author
        [`indexByAuthor/${user.uid}/${solutionId}`]: true,
        // Index by language
        [`indexByLanguage/${language}/${solutionId}`]: true,
        // Update Group Stats (leaderboard)
        [`groupStats/${groupId}/${user.uid}`]: {
          lastSubmissionAt: submissionTime,
          // Placeholder for submissions.
        },
        // Update User Stats (for user profile)
        [`userStats/${user.uid}/${groupId}`]: {
          lastSubmissionAt: submissionTime,
          // Placeholder for submissions.
        },
      };

      // Index by tags
      tagsArray.forEach((t) => {
        updates[`indexByTag/${t}/${solutionId}`] = true
      })
      
      await update(ref(db), updates)


      // Clear form after successful submission
      setCode("")
      setApproach("")
      setTc("")
      setSc("")
      setProblemLink("")
      setTags("")
      alert("Solution submitted successfully!") // Use a proper toast/notification in a real app

    } catch (e) {
      console.error("Submission failed:", e)
      setError("Failed to submit solution. Please check your connection.")
    } finally {
      setIsSubmitting(false)
    }

    
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-100 p-3 text-sm font-medium text-red-700">{error}</div>}
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
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Solution"}
        </Button>
      </div>
    </div>
  )
}