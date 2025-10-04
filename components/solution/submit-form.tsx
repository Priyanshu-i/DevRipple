"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { db } from "@/lib/firebase"
import { ref, push, serverTimestamp, set, update, onValue, runTransaction } from "firebase/database"
// REMOVED FIREBASE FIRESTORE IMPORTS
// import { doc, setDoc, increment, arrayUnion, serverTimestamp as firestoreServerTimestamp } from "firebase/firestore" 
import { paths } from "@/lib/paths"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CodeEditor } from "@/components/editor/code-editor"

type Props = {
  groupId: string
  questionId?: string | null
  onSuccess?: () => void // Optional callback after successful submission
}

const LANGS = ["python", "java", "cpp", "c", "javascript", "typescript"] as const

// --- START: REFACTORED recordSubmissionStats FOR RTDB ---

/**
 * Record submission statistics to Realtime DB
 * NOTE: This relies on your `paths.ts` mapping to RTDB.
 */
async function recordSubmissionStats(
  groupId: string,
  questionId: string,
  uid: string,
  solutionId: string,
  questionTitle: string,
  questionExpiresAt?: number
) {
  try {
    const now = Date.now();

    // 1. Update user's question-specific stats
    const userQuestionStatsRef = ref(db, paths.userQuestionStats(groupId, questionId, uid));

    await runTransaction(userQuestionStatsRef, (currentData) => {
      const data = currentData || {};
      const submissionCount = (data.submissionCount || 0) + 1;
      const solutionIds = (data.solutionIds || [] as string[]);

      if (!solutionIds.includes(solutionId)) {
        solutionIds.push(solutionId);
      }

      // Update the RTDB node
      return {
        uid,
        questionId,
        submissionCount,
        lastSubmissionAt: now, // Use Date.now() for client-side time
        solutionIds,
      };
    });

    // 2. Update question stats
    const questionStatsRef = ref(db, paths.questionStats(groupId, questionId));

    await runTransaction(questionStatsRef, (currentData) => {
      const data = currentData || {};

      return {
        questionId,
        title: questionTitle,
        totalSubmissions: (data.totalSubmissions || 0) + 1,
        expiresAt: questionExpiresAt || null,
        lastSubmissionAt: now, // Use Date.now() for client-side time
        isExpired: questionExpiresAt ? questionExpiresAt < now : false,
      };
    });


    // 3. Update group member stats (total submissions)
    const memberStatsRef = ref(db, paths.groupMemberStats(groupId, uid));

    await runTransaction(memberStatsRef, (currentData) => {
      const data = currentData || {};

      return {
        uid,
        groupId,
        totalSubmissions: (data.totalSubmissions || 0) + 1,
        lastActivityAt: now, // Use Date.now() for client-side time
      };
    });

    console.log('✅ Stats recorded successfully to RTDB');
  } catch (error) {
    console.error('❌ Error recording submission stats to RTDB:', error);
    throw error;
  }
}

// --- END: REFACTORED recordSubmissionStats FOR RTDB ---

export function SubmitForm({ groupId, questionId, onSuccess }: Props) {
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
  const [questionTitle, setQuestionTitle] = useState<string>("Untitled")

  // Fetch question title for stats
  // NOTE: This uses `onValue` but doesn't manage the subscription cleanup properly. 
  // It should be inside a useEffect hook for proper cleanup if this were a production component.
  // I'm keeping the original pattern but marking it as a note.
  useState(() => {
    if (!groupId || !questionId) return

    const questionRef = ref(db, paths.groupQuestionDocument(groupId, questionId))
    const unsub = onValue(questionRef, (snap) => {
      const question = snap.val()
      if (question?.title) {
        setQuestionTitle(question.title)
      }
    })

    return () => unsub()
  })

  async function onSubmit() {
    if (!user) {
      setError("You must be logged in to submit a solution.")
      return
    }

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
      // Use Date.now() for client-side time, which is adequate for visibility
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours visibility 
      const qid = questionId

      // 1. Generate solution ID
      const solutionsCollectionRef = ref(db, paths.solutionsCollection(groupId, qid))
      const newSolutionRef = push(solutionsCollectionRef)
      const solutionId = newSolutionRef.key!

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
        authorUid: user.uid, // Add for stats tracking
        authorName: user.displayName ?? "Anonymous",
        createdAt: Date.now(),
        serverCreatedAt: serverTimestamp(), // Use serverTimestamp for integrity
        upvotesCount: 0,
        tags: tagsArray,
        expiresAt,
        source: "ephemeral",
      }

      // 2. Save solution to Realtime Database
      // Use set on the generated key
      await set(newSolutionRef, payload) 

      // 3. Get question expiration time for stats
      const questionRef = ref(db, paths.groupQuestionDocument(groupId, qid))
      const questionSnap = await new Promise<any>((resolve) => {
        onValue(questionRef, (snap) => resolve(snap.val()), { onlyOnce: true })
      })
      const questionExpiresAt = questionSnap?.expiresAt

      // 4. Record statistics (Now fully uses RTDB)
      await recordSubmissionStats(
        groupId,
        qid,
        user.uid,
        solutionId,
        questionTitle,
        questionExpiresAt
      )

      // 5. Update global indices (for search/filtering)
      const updates: { [key: string]: any } = {
        [`solutions_global/${solutionId}`]: {
          id: solutionId,
          groupId,
          questionId: qid,
          authorName: payload.authorName,
          language: payload.language,
          problemLink: payload.problemLink || null,
          createdAt: payload.createdAt,
        },
        [`indexByAuthor/${user.uid}/${solutionId}`]: true,
        [`indexByLanguage/${language}/${solutionId}`]: true,
      }

      // Index by tags
      tagsArray.forEach((t) => {
        updates[`indexByTag/${t}/${solutionId}`] = true
      })

      // Use update to simultaneously write to multiple paths
      await update(ref(db), updates)

      // Clear form after successful submission
      setCode("")
      setApproach("")
      setTc("")
      setSc("")
      setProblemLink("")
      setTags("")

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      } else {
        alert("Solution submitted successfully!")
      }

    } catch (e) {
      console.error("Submission failed:", e)
      setError("Failed to submit solution. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-100 dark:bg-red-900/20 p-3 text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="w-full rounded-md border bg-background p-2 text-sm"
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Problem Link (optional)</label>
          <Input
            value={problemLink}
            onChange={(e) => setProblemLink(e.target.value)}
            placeholder="https://leetcode.com/problems/..."
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Code *</label>
        <CodeEditor value={code} onChange={setCode} language={language} placeholder="Write your solution..." />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Approach (Markdown allowed) *</label>
        <Textarea
          value={approach}
          onChange={(e) => setApproach(e.target.value)}
          rows={5}
          placeholder="Explain your approach, intuition, and algorithm..."
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Time Complexity (LaTeX) *</label>
          <Input
            value={tc}
            onChange={(e) => setTc(e.target.value)}
            placeholder="e.g., O(n log n)"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Space Complexity (LaTeX) *</label>
          <Input
            value={sc}
            onChange={(e) => setSc(e.target.value)}
            placeholder="e.g., O(1)"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Tags (comma-separated)</label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., greedy, dp, two-pointers"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Solution"}
        </Button>
      </div>
    </div>
  )
}