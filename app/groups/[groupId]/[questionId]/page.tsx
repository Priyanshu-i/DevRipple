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
import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {GroupInfoPage} from "@/components/groups/info"
import { paths } from "@/lib/paths"

interface Group {
  name: string;
  description?: string;
  adminUid: string;
}

interface Question {
  id: string;
  title: string;
  link?: string;
  prompt?: string;
  points?: number;
  difficulty?: string;
  createdAt: number; // Used for finding the "latest" question
}
const useLatestQuestionId = (groupId: string | null): string | null | undefined => {
  const { data: questionsObj } = useSWRSubscription(
    groupId ? paths.groupQuestionsCollection(groupId) : null,
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
      return () => unsub()
    },
  )

  if (!questionsObj) return undefined;
  
  const questions: Question[] = Object.entries(questionsObj).map(([id, q]: any) => ({
    ...q,
    id: id,
    createdAt: q.createdAt || 0,
  }));
  
  if (questions.length === 0) return null;

  const latestQuestion = questions.reduce((latest, current) => 
    current.createdAt > latest.createdAt ? current : latest
  );

  return latestQuestion.id;
};

interface Solution {
    id: string;
    // ... other fields
    upvotesCount?: number;
    // The actual code is often missing on permanent, minimal solutions
    code: string; 
    language: string;
    authorName: string;
    expiresAt?: number;
    localOnly?: boolean;
}

export default function GroupPage() {
  const params = useParams<{ groupId: string }>()
  const groupId = params.groupId
  const { user } = useAuth()

  const { data: group } = useSWRSubscription(groupId ? paths.group(groupId) : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() as Group | null))
    return () => unsub()
  })

  const currentQuestionId = useLatestQuestionId(groupId);

  const { data: featuredQuestion } = useSWRSubscription(
    groupId && currentQuestionId ? paths.groupQuestionDocument(groupId, currentQuestionId) : null,
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() as Question | null))
      return () => unsub()
    },
  )
  
  const { data: solutions } = useSWRSubscription(
    groupId && currentQuestionId ? `solutions_for_question/${groupId}/${currentQuestionId}` : null, 
    // NOTE: This assumes a path for solutions specifically tied to the question ID:
    // If you store solutions globally, use solutionsGlobal() and filter by questionId.
    // Since your `paths` is missing a collection path for solutions *per question*, 
    // I use a hypothetical path, which you might need to adjust.
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => {
        const val = snap.val() || {}
        const arr = Object.values(val) as any[]
        arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        next(null, arr)
      })
      return () => unsub()
    }
  )

  const { data: ephemerals } = useSWRSubscription(
    groupId && currentQuestionId ? paths.solutionsEphemeral(groupId, currentQuestionId) : null,
    // Path resolves to: `ephemeralSubmissions/${groupId}/${questionId}`
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => {
        const val = snap.val() || {}
        const arr = Object.values(val) as any[]
        next(null, arr)
      })
      return () => unsub()
    },
  )

  const isAdmin = user && group?.adminUid === user.uid

  const now = Date.now()
  const ephemeralValid = (ephemerals || []).filter((s: any) => !s.expiresAt || s.expiresAt > now)

  let mergedSolutions = ephemeralValid
   if (user) {
    try {
      const key = `devripple_submissions/${groupId}` // backward compat if different key used before
      const key2 = `devripple_submissions_${groupId}`
      const ls = JSON.parse(localStorage.getItem(key) || localStorage.getItem(key2) || "[]")
      if (Array.isArray(ls) && ls.length) {
        // Filter local solutions to only include those for the current question
        const localForCurrentQuestion = ls.filter((s: any) => s.questionId === currentQuestionId)

        // mark local entries
        const withFlag = localForCurrentQuestion.map((s: any) => ({ ...s, localOnly: true }))
        // de-duplicate by id preferring ephemeral
        const byId = new Map<string, any>()
        ;[...withFlag, ...ephemeralValid].forEach((s: any) => byId.set(s.id, s))
        mergedSolutions = Array.from(byId.values())
      }
    } catch {}
  }
  mergedSolutions.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0))


  async function toggleBookmark(solutionId: string) {
    if (!user) return
    const bmRef = ref(db, `bookmarks/${user.uid}/${solutionId}`)
    await runTransaction(bmRef, (curr) => (curr ? null : true))
  }


  async function toggleUpvote(solutionId: string) {
    if (!user) return
    const voteRef = ref(db, `upvotes/solutions/${solutionId}/${user.uid}`)
    const res = await runTransaction(voteRef, (curr) => (curr ? null : true))
    const nowValue = res.snapshot.val() // true if added, null if removed
    const added = !!nowValue
    const countRef = ref(db, `solutions/${groupId}/${solutionId}/upvotesCount`)
    await runTransaction(countRef, (curr) => {
      const base = typeof curr === "number" ? curr : 0
      return added ? base + 1 : Math.max(0, base - 1)
    })
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/groups/${groupId}/info`} className="text-inherit hover:text-inherit">
          <h1 className="text-2xl font-semibold">{group?.name ?? "Group"}</h1>
        </Link>
        <Link
          href={`/groups/${groupId}/submit`}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          Submit Solution
        </Link>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{group?.description}</p>

      {/* FEATURED QUESTION SECTION (Replaces "Today's Question") */}
      <section className="mb-8 rounded-md border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {currentQuestionId === undefined 
              ? "Loading Featured Question..." 
              : currentQuestionId === null
                ? "No Questions Posted"
                : "Featured Question"
            }
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
            
            {/* AdminForm is now used to edit the CURRENT featured question */}
            {isAdmin && featuredQuestion.id ? (
              <div className="pt-3">
                <AdminQuestionForm
                  groupId={groupId}
                  existing={featuredQuestion as any}
                  onSaved={async (qid) => {
                    // No need to update group.todaysQuestionId since it doesn't exist.
                    // The component will re-fetch and find the latest on its own.
                    console.log(`Question ${qid} saved/updated.`)
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {currentQuestionId === null
              ? "No questions have been posted to this group yet."
              : "Loading question details..."
            }
            {/* Admin form for creating a NEW question if none exists */}
            {isAdmin && currentQuestionId === null ? (
              <div className="pt-3">
                <AdminQuestionForm
                  groupId={groupId}
                  onSaved={async (qid) => {
                    console.log(`New question ${qid} posted.`)
                  }}
                />
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Solutions for Featured Question</h2>
        {mergedSolutions?.length ? (
          mergedSolutions.map((s: any) => (
            <SolutionItem
              key={s.id}
              groupId={groupId}
              userDisplayName={user?.displayName ?? "Anonymous"}
              userUid={user?.uid ?? null}
              solution={s}
              onUpvote={() => toggleUpvote(s.id)}
              onBookmark={() => toggleBookmark(s.id)}
            />
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No submissions yet for this question.</div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Leaderboard</h2>
        <GroupLeaderboard groupId={groupId} />
      </section>
    </main>
  )
}

function SolutionItem({
  groupId,
  userDisplayName,
  userUid,
  solution,
  onUpvote,
  onBookmark,
}: {
  groupId: string
  userDisplayName: string
  userUid: string | null
  solution: any
  onUpvote: () => void
  onBookmark: () => void
}) {
  const { data: comments = [] } = useSWRSubscription(
    solution?.id ? `comments/${solution.id}` : null,
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => {
        const val = snap.val() || {}
        const arr = Object.values(val) as any[]
        arr.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        next(null, arr)
      })
      return () => unsub()
    },
  )

  const inline = (comments as any[]).reduce<Record<number, Array<{ id: string; text: string; author: string }>>>(
    (acc, c: any) => {
      if (c.lineNumber) {
        acc[c.lineNumber] = acc[c.lineNumber] || []
        acc[c.lineNumber].push({ id: c.id, text: c.content, author: c.author })
      }
      return acc
    },
    {},
  )

  async function addInlineComment(line: number, text: string) {
    if (!userUid) return
    const cid = push(ref(db, `comments/${solution.id}`)).key!
    await set(ref(db, `comments/${solution.id}/${cid}`), {
      id: cid,
      author: userDisplayName,
      authorUid: userUid,
      content: text,
      createdAt: serverTimestamp(),
      parentId: null,
      lineNumber: line,
      upvotes: 0,
    })
  }

  async function addComment(content: string, parentId?: string | null) {
    if (!userUid) return
    const cid = push(ref(db, `comments/${solution.id}`)).key!
    await set(ref(db, `comments/${solution.id}/${cid}`), {
      id: cid,
      author: userDisplayName,
      authorUid: userUid,
      content,
      createdAt: serverTimestamp(),
      parentId: parentId || null,
      upvotes: 0,
    })
  }

  async function upvoteComment(commentId: string) {
    const countRef = ref(db, `comments/${solution.id}/${commentId}/upvotes`)
    await runTransaction(countRef, (curr) => (typeof curr === "number" ? curr + 1 : 1))
  }

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="font-medium">{solution.authorName}</div>
          {solution.localOnly ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              Local copy
            </span>
          ) : null}
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
          inlineComments={inline}
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

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" onClick={onUpvote}>
          Upvote ({solution.upvotesCount ?? 0})
        </Button>
        <Button size="sm" variant="secondary" onClick={onBookmark}>
          Bookmark
        </Button>
      </div>

      <div className="mt-4">
        <CommentsThread
          comments={(comments as any[]).map((c: any) => ({
            id: c.id,
            author: c.author,
            content: c.content,
            createdAt: c.createdAt,
            upvotes: c.upvotes ?? 0,
            parentId: c.parentId || null,
          }))}
          onAdd={(content, parentId) => addComment(content, parentId)}
          onUpvote={(cid) => upvoteComment(cid)}
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

  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 text-sm font-medium">{existing ? "Edit Today's Question" : "Post Today's Question"}</div>
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
              await update(ref(db, `groupQuestions/${groupId}/${existing.id}`), {
                title: title || null,
                link: link || null,
                prompt: prompt || "",
                updatedAt: serverTimestamp(),
              })
              await onSaved(existing.id)
            } else {
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

function TimeRemaining({ expiresAt }: { expiresAt?: number | null }) {
  if (!expiresAt) return null
  const remaining = Math.max(0, expiresAt - Date.now())
  const hrs = Math.floor(remaining / (1000 * 60 * 60))
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  return (
    <span className="text-xs text-muted-foreground">
      Visible for {hrs}h {mins}m
    </span>
  )
}
