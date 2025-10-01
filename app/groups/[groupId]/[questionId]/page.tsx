"use client"

import { useParams } from "next/navigation"
import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref, runTransaction, set, serverTimestamp, push, update } from "firebase/database"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { CodeViewer } from "@/components/solution/code-viewer"
import { CommentsThread } from "@/components/solution/comments-thread"
import { useEffect, useState, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
// import { GroupInfoPage } from "@/components/groups/info" // Not used here, but kept in imports
import { paths } from "@/lib/paths"

interface Group {
  name: string
  description?: string
  adminUid: string
}
type Comment = {
  id: string
  author: string
  content: string
  createdAt: number // Use Date for display in a real app, but sticking to number for now
  upvotes?: number
  parentId?: string | null
}

type RTDBComment = Comment & {
  authorUid: string
  lineNumber?: number // Added for inline comments
}

interface Question {
  id: string
  title: string
  link?: string
  prompt?: string
  points?: number
  difficulty?: string
  createdAt: number
}

interface Solution {
  id: string
  // ... other fields
  upvotesCount?: number
  code: string
  language: string
  authorName: string
  expiresAt?: number
  
}

export default function GroupQuestionPage() {
  // 1. URL Parameter Change: Expects both groupId and questionId
  const params = useParams<{ groupId: string; questionId: string }>()
  const groupId = params.groupId
  const questionId = params.questionId
  const { user } = useAuth()

  // Fetch Group Info
  const { data: group } = useSWRSubscription(groupId ? paths.group(groupId) : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() as Group | null))
    return () => unsub()
  })

  // Fetch Featured Question (using questionId from URL)
  const { data: featuredQuestion } = useSWRSubscription(
    groupId && questionId ? paths.groupQuestionDocument(groupId, questionId) : null,
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() as Question | null))
      return () => unsub()
    },
  )

  // Fetch Solutions for the specific question
  const { data: solutions } = useSWRSubscription(
    groupId && questionId ? paths.solutionsCollection(groupId, questionId) : null,
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => {
        const val = snap.val() || {}
        const arr = Object.values(val) as any[]
        // Sort by createdAt descending
        arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        next(null, arr)
      })
      return () => unsub()
    },
  )

  const isAdmin = user && group?.adminUid === user.uid
  
  const mergedSolutions = solutions || []

  /**
   * Toggles the upvote status for a solution and updates the count.
   * Uses paths.solutionUpvotes
   * @param solutionId The ID of the solution.
   */
  async function toggleUpvote(solutionId: string) {
    if (!user || !groupId || !questionId) return
    const upvoteRef = ref(db, paths.solutionUpvotes(groupId, questionId, solutionId, user.uid))

    // 1. Toggle the user's vote status
    const res = await runTransaction(upvoteRef, (curr) => (curr ? null : true))
    const nowValue = res.snapshot.val() // true if added, null if removed
    const added = !!nowValue

    // 2. Update the upvotesCount on the solution document
    const countRef = ref(db, paths.solutionDocument(groupId, questionId, solutionId) + "/upvotesCount")
    await runTransaction(countRef, (curr) => {
      const base = typeof curr === "number" ? curr : 0
      return added ? base + 1 : Math.max(0, base - 1)
    })
  }

  // Simplified loading states based on current state
  let questionSectionHeader: string
  if (groupId && questionId) {
    if (featuredQuestion === undefined) {
      questionSectionHeader = "Loading Question Details..."
    } else if (featuredQuestion === null) {
      questionSectionHeader = "Question Not Found"
    } else {
      questionSectionHeader = "Current Question"
    }
  } else {
    questionSectionHeader = "Invalid URL"
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/groups/${groupId}`} className="text-inherit hover:text-inherit">
          <h1 className="text-2xl font-semibold">{group?.name ?? "Group"}</h1>
        </Link>
        {/* Note: The submission path might need to be `/groups/${groupId}/${questionId}/submit` depending on the route setup */}
        <Link
          href={`/groups/${groupId}/${questionId}/submit`} 
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          Submit Solution
        </Link>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{group?.description}</p>

      {/* QUESTION SECTION */}
      <section className="mb-8 rounded-md border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {questionSectionHeader}
          </h2>
          {featuredQuestion && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {featuredQuestion.points ? <span>Points: {featuredQuestion.points}</span> : null}
              {featuredQuestion.difficulty ? <span>({featuredQuestion.difficulty})</span> : null}
            </div>
          )}
        </div>

        {featuredQuestion ? (
          <div className="space-y-3">
            {featuredQuestion.title ? <div className="text-xl font-bold">{featuredQuestion.title}</div> : null}
            {featuredQuestion.link ? (
              <div className="text-sm">
                <a href={featuredQuestion.link} target="_blank" rel="noreferrer" className="underline text-blue-500 hover:text-blue-600">
                  Problem Link
                </a>
              </div>
            ) : null}
            {featuredQuestion.prompt ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{featuredQuestion.prompt}</ReactMarkdown>
              </div>
            ) : null}

            {/* AdminForm is used to edit the current question */}
            {isAdmin && featuredQuestion.id ? (
              <div className="pt-3">
                <AdminQuestionForm
                  groupId={groupId}
                  existing={featuredQuestion as any}
                  onSaved={async (qid) => {
                    console.log(`Question ${qid} saved/updated.`)
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {featuredQuestion === null
              ? "The question specified in the URL does not exist."
              : "Loading question details..."
            }
            {/* Admin form for creating a NEW question if questionId is in the URL but not found */}
            {isAdmin && featuredQuestion === null && questionId ? (
              <div className="pt-3">
                {/* Note: AdminForm only supports existing questionId in URL if it is undefined (no fetch yet) or found.
                    If it's null, we assume the user wants to create a question with that ID, but we need to pass a template. 
                    The form logic below is more suited for creating a NEW latest question, or editing a found one.
                    To create a specific ID, the component would need an optional `initialId` prop. 
                    For simplicity, I'll remove the "create new" form here since the URL is a specific ID.
                    The admin should go to a different route to post a *new* question.
                 */}
                <div className="text-red-500">To create a new question, please use a dedicated admin tool. This page is for viewing an existing question ID: {questionId}.</div>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Solutions for Current Question</h2>
        {mergedSolutions?.length ? (
          mergedSolutions.map((s: any) => (
            <SolutionItem
              key={s.id}
              groupId={groupId}
              questionId={questionId} // Pass questionId now
              userDisplayName={user?.displayName ?? "Anonymous"}
              userUid={user?.uid ?? null}
              solution={s}
              onUpvote={() => toggleUpvote(s.id)}
              // onBookmark={() => toggleBookmark(s.id)}
            />
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No submissions yet for this question.</div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Leaderboard</h2>
        <GroupLeaderboard groupId={groupId}  />
      </section>
    </main>
  )
}

function SolutionItem({
  groupId,
  questionId, // New prop
  userDisplayName,
  userUid,
  solution,
  onUpvote,
  // onBookmark,
}: {
  groupId: string
  questionId: string
  userDisplayName: string
  userUid: string | null
  solution: any
  onUpvote: () => void
  // onBookmark: () => void
}) {
  // Fetch comments using the new path structure
const { data: allComments = [] } = useSWRSubscription(
  solution?.id ? paths.solutionComments(groupId, questionId, solution.id) : null,
  (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => {
      const val = snap.val() || {}
      // Convert object to array of RTDBComment
      const arr: RTDBComment[] = Object.values(val)
      // Sort by creation time (important for the thread structure)
      arr.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
      next(null, arr)
    })
    return () => unsub()
  },
)

  /**
   * Filter and Memoize the General Comments for the CommentsThread component.
   * We exclude any comments that have a lineNumber (inline comments).
  */
  const generalComments = useMemo(() => {
      return (allComments as RTDBComment[])
          .filter((c) => !c.lineNumber) // <-- KEY CHANGE: Filter out inline comments
          .map((c) => ({
              // Map to the exact Comment type required by the CommentsThread component
              id: c.id,
              author: c.author,
              content: c.content,
              createdAt: c.createdAt,
              upvotes: c.upvotes,
              parentId: c.parentId || null,
          }))
          // Ensure all top-level comments and their direct replies are included.
          // The sorting for the thread display is handled inside CommentsThread.
  }, [allComments])

  // =========================================================================
// 2. INLINE COMMENT SEPARATION (For existing functionality)
// =========================================================================

const inlineCommentsMap = useMemo(() => {
  return (allComments as RTDBComment[])
    .filter((c) => c.lineNumber) // <-- Only include comments with a line number
    .reduce<Record<number, Array<{ id: string; content: string; author: string }>>>(
      (acc, c) => {
        if (c.lineNumber) {
          acc[c.lineNumber] = acc[c.lineNumber] || []
          acc[c.lineNumber].push({ id: c.id, content: c.content, author: c.author })
        }
        return acc
      },
      {},
    )
}, [allComments])

  /**
   * Adds an inline comment to a specific line number.
   * Uses paths.solutionComments
   * @param line The line number to comment on.
   * @param text The content of the comment.
   */
  async function addInlineComment(line: number, text: string) {
  if (!userUid) return
  const commentRef = ref(db, paths.solutionComments(groupId, questionId, solution.id))
  const newCommentRef = push(commentRef) // Generate a unique ID first
  const cid = newCommentRef.key!

  await set(newCommentRef, {
    id: cid,
    author: userDisplayName,
    authorUid: userUid,
    content: text,
    createdAt: serverTimestamp(),
    parentId: null, // Inline comments are always root in the thread hierarchy
    lineNumber: line, // <-- KEY: This flags it as an inline comment
    upvotes: 0,
  })
}

  /**
   * Adds a root or nested comment.
   * Uses paths.solutionComments
   * @param content The content of the comment.
   * @param parentId The ID of the parent comment, or null for a root comment.
   */
  async function addComment(content: string, parentId?: string | null) {
  if (!userUid) return
  const commentRef = ref(db, paths.solutionComments(groupId, questionId, solution.id))
  const newCommentRef = push(commentRef)
  const cid = newCommentRef.key!

  await set(newCommentRef, {
    id: cid,
    author: userDisplayName,
    authorUid: userUid,
    content,
    createdAt: serverTimestamp(),
    parentId: parentId || null, // null for root, ID for reply
    upvotes: 0,
    // Note: No lineNumber field, so it is considered a general comment
  })
}

  /**
   * Upvotes a specific comment - FIXED to prevent multiple upvotes per user.
   * Uses a path structure to track individual user upvotes.
   * @param commentId The ID of the comment to upvote.
   */
  async function upvoteComment(commentId: string) {
    if (!userUid) return
    
    // Path to track if this user has upvoted this comment
    const userUpvotePath = `${paths.solutionComments(groupId, questionId, solution.id)}/${commentId}/userUpvotes/${userUid}`
    const userUpvoteRef = ref(db, userUpvotePath)
    
    // Toggle the user's upvote status
    const res = await runTransaction(userUpvoteRef, (curr) => (curr ? null : true))
    const nowValue = res.snapshot.val()
    const added = !!nowValue
    
    // Update the upvotes count based on whether we added or removed the upvote
    const countPath = `${paths.solutionComments(groupId, questionId, solution.id)}/${commentId}/upvotes`
    const countRef = ref(db, countPath)
    
    await runTransaction(countRef, (curr) => {
      const base = typeof curr === "number" ? curr : 0
      return added ? base + 1 : Math.max(0, base - 1)
    })
  }

  const solutionExpired = solution.expiresAt && solution.expiresAt < Date.now()

  return (
    <div className={`rounded-md border p-3 ${solutionExpired ? 'opacity-50' : ''}`}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="font-medium">{solution.authorName}</div>
          {/* Local copy tag removed as local storage logic is gone */}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">{solution.language}</div>
          <TimeRemaining expiresAt={solution.expiresAt} />
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {solution.problemLink ? (
          <a href={solution.problemLink} target="_blank" rel="noreferrer" className="underline">
            Problem Link
          </a>
        ) : (
          "Custom assignment"
        )}
      </div>

      <div className="my-3">
        <CodeViewer
          code={solution.code}
          language={solution.language}
          // inlineComments={inline}
          onAddInlineComment={addInlineComment}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border p-2">
          <div className="mb-1 text-xs text-muted-foreground">Approach</div>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{solution.approach || ""}</ReactMarkdown>
          </div>
        </div>
        <div className="rounded-md border p-2">
          <div className="mb-1 text-xs text-muted-foreground">T.C. (LaTeX)</div>
          <div className="text-sm">{solution.tc}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="mb-1 text-xs text-muted-foreground">S.C. (LaTeX)</div>
          <div className="text-sm">{solution.sc}</div>
        </div>
      </div>

      {solutionExpired ? (
        <div className="mt-3 text-sm font-semibold text-red-500">Solution expired. Upvoting and commenting are disabled.</div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={onUpvote}>
            Upvote ({solution.upvotesCount ?? 0})
          </Button>
          {/* <Button size="sm" variant="secondary" onClick={onBookmark}>
            Bookmark
          </Button> */}
        </div>
      )}
      

      <div className="mt-4">
        <CommentsThread
          comments={generalComments} // <-- Pass the filtered list of general comments
          onAdd={addComment}       // <-- Use the function for general comments/replies
          onUpvote={upvoteComment}
        />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}

function AdminQuestionForm({
  groupId,
  existing,
  onSaved,
}: {
  groupId: string
  existing?: { id: string; title?: string; link?: string; prompt?: string } | null
  onSaved: (qid: string) => Promise<void>
}) {
  const [title, setTitle] = useState(existing?.title ?? "")
  const [link, setLink] = useState(existing?.link ?? "")
  const [prompt, setPrompt] = useState(existing?.prompt ?? "")

  // Sync internal state with external props
  useEffect(() => {
    setTitle(existing?.title ?? "")
    setLink(existing?.link ?? "")
    setPrompt(existing?.prompt ?? "")
  }, [existing])

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 text-sm font-medium">{existing ? `Edit Question: ${existing.title || existing.id}` : "Post New Question"}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm">Title</label>
          <input
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Two Sum (Easy)"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Problem Link (optional)</label>
          <input
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://leetcode.com/problems/two-sum/"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-sm">Prompt (Markdown)</label>
        <textarea
          className="h-32 w-full rounded-md border bg-background p-2 text-sm"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the problem, constraints, and examples..."
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={async () => {
            if (!title.trim() && !prompt.trim() && !link.trim()) return
            if (existing?.id) {
              // Update existing question
              await update(ref(db, `groupQuestions/${groupId}/${existing.id}`), {
                title: title || null,
                link: link || null,
                prompt: prompt || "",
                updatedAt: serverTimestamp(),
              })
              await onSaved(existing.id)
            } else {
              // Post new question
              const qid = push(ref(db, `groupQuestions/${groupId}`)).key!
              await set(ref(db, `groupQuestions/${groupId}/${qid}`), {
                id: qid,
                title: title || null,
                link: link || null,
                prompt: prompt || "",
                createdAt: serverTimestamp(),
              })
              await onSaved(qid)
            }
          }}
        >
          {existing ? "Save" : "Post"}
        </Button>
      </div>
    </div>
  )
}

interface UserProfile {
  displayName: string
}
// Define a type for storing UIDs to their names
interface NameMap {
  [uid: string]: string
}

function GroupLeaderboard({ groupId }: { groupId: string }) {
  // Fetches the leaderboard stats (UIDs and submission counts)
  const { data: stats } = useSWRSubscription(groupId ? `groupStats/${groupId}` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() || {}))
    return () => unsub()
  })

  // New state to store user names
  const [userNames, setUserNames] = useState<NameMap>({})

  // Process the stats data and sort the rows
  const rows = Object.entries(stats || {}).map(([uid, s]: any) => ({
    uid,
    submissions: s.submissions || 0,
    lastSubmissionAt: s.lastSubmissionAt || 0,
  }))
  rows.sort((a, b) => b.submissions - a.submissions || b.lastSubmissionAt - a.lastSubmissionAt)
  
  // Helper function to get the display name, falls back to UID
  const getDisplayName = (uid: string) => userNames[uid] || uid

  // --- Effect to Fetch User Names ---
  useEffect(() => {
    if (!stats) return

    // Get the UIDs present in the stats data
    const uidsInStats = Object.keys(stats)
    
    // Filter for UIDs whose names haven't been loaded yet
    const uidsToFetch = uidsInStats.filter(uid => !userNames[uid])

    if (uidsToFetch.length === 0) return

    const listeners: (() => void)[] = []

    uidsToFetch.forEach(uid => {
      // Assuming user profiles are stored under the path `users/${uid}/displayName`
      const userRef = ref(db, `users/${uid}/displayName`)
      const listener = onValue(userRef, (snap) => {
        const name = snap.val()
        if (name) {
          setUserNames(prev => ({ ...prev, [uid]: name }))
        } else {
          // Fallback if the user profile/name doesn't exist
          setUserNames(prev => ({ ...prev, [uid]: "Unknown User" }))
        }
      })
      listeners.push(listener)
    })

    // Cleanup function: remove all active listeners
    return () => {
      listeners.forEach(unsub => unsub())
    }
  }, [stats, userNames]) // Dependency on stats and userNames

  return rows.length ? (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-2 pr-4">User</th>
            <th className="py-2 pr-4">Submissions</th>
            <th className="py-2">Last submission</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.uid} className="border-t">
              <td className="py-2 pr-4">
                <a className="underline" href={`/contact/${r.uid}`}>
                  {/* Use getDisplayName instead of r.uid */}
                  {getDisplayName(r.uid)} 
                </a>
              </td>
              <td className="py-2 pr-4">{r.submissions}</td>
              <td className="py-2">{r.lastSubmissionAt ? new Date(r.lastSubmissionAt).toLocaleString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="mt-3 text-sm text-muted-foreground">No stats yet.</div>
  )
}

/**
 * Calculates and displays the time remaining until a solution expires.
 * Displays "Expired" if the time has passed.
 * @param expiresAt The timestamp when the solution expires.
 */
function TimeRemaining({ expiresAt }: { expiresAt?: number | null }) {
  if (!expiresAt) return null
  const remaining = Math.max(0, expiresAt - Date.now())

  if (remaining === 0) {
    return (
      <span className="text-xs text-red-500 font-semibold">
        Expired
      </span>
    )
  }

  const hrs = Math.floor(remaining / (1000 * 60 * 60))
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  return (
    <span className="text-xs text-muted-foreground">
      Visible for {hrs}h {mins}m
    </span>
  )
}