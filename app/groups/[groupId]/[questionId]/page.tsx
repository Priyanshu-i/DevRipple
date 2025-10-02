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
import { paths } from "@/lib/paths"
import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react"

interface Group {
  name: string
  description?: string
  adminUid: string
}

type Comment = {
  id: string
  author: string
  content: string
  createdAt: number
  upvotes?: number
  parentId?: string | null
}

type RTDBComment = Comment & {
  authorUid: string
  lineNumber?: number
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
  upvotesCount?: number
  code: string
  language: string
  authorName: string
  expiresAt?: number
}

interface UserSubmissionStats {
  submissions: number
  lastSubmissionAt: number
}

interface GroupStats {
  [uid: string]: UserSubmissionStats | undefined
}

interface GroupMembers {
  [uid: string]: {
    joinedAt: number
  }
}

interface NameMap {
  [uid: string]: string
}

function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
  className = "",
}: {
  title: React.ReactNode
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const Icon = isOpen ? ChevronDown : ChevronRight

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left text-sm font-medium focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </div>
        {count !== undefined && (
          <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {count}
          </div>
        )}
      </button>
      {isOpen && <div className="mt-2">{children}</div>}
    </div>
  )
}

export default function GroupQuestionPage() {
  const params = useParams<{ groupId: string; questionId: string }>()
  const groupId = params.groupId
  const questionId = params.questionId
  const { user } = useAuth()

  const { data: group } = useSWRSubscription(groupId ? paths.group(groupId) : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() as Group | null))
    return () => unsub()
  })

  const { data: featuredQuestion } = useSWRSubscription(
    groupId && questionId ? paths.groupQuestionDocument(groupId, questionId) : null,
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() as Question | null))
      return () => unsub()
    },
  )

  const { data: solutions } = useSWRSubscription(
    groupId && questionId ? paths.solutionsCollection(groupId, questionId) : null,
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => {
        const val = snap.val() || {}
        const arr = Object.values(val) as any[]
        arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        next(null, arr)
      })
      return () => unsub()
    },
  )

  const isAdmin = user && group?.adminUid === user.uid
  const mergedSolutions = solutions || []

  async function toggleUpvote(solutionId: string) {
    if (!user || !groupId || !questionId) return
    const upvoteRef = ref(db, paths.solutionUpvotes(groupId, questionId, solutionId, user.uid))

    const res = await runTransaction(upvoteRef, (curr) => (curr ? null : true))
    const nowValue = res.snapshot.val()
    const added = !!nowValue

    const countRef = ref(db, paths.solutionDocument(groupId, questionId, solutionId) + "/upvotesCount")
    await runTransaction(countRef, (curr) => {
      const base = typeof curr === "number" ? curr : 0
      return added ? base + 1 : Math.max(0, base - 1)
    })
  }

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
        <Link
          href={`/groups/${groupId}/${questionId}/submit`} 
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        >
          Submit Solution
        </Link>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{group?.description}</p>

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
            {isAdmin && featuredQuestion === null && questionId ? (
              <div className="pt-3">
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
              questionId={questionId}
              userDisplayName={user?.displayName ?? "Anonymous"}
              userUid={user?.uid ?? null}
              solution={s}
              onUpvote={() => toggleUpvote(s.id)}
            />
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No submissions yet for this question.</div>
        )}
      </section>

      <section className="mt-10">
        <GroupLeaderboard groupId={groupId} />
      </section>
    </main>
  )
}

function SolutionItem({
  groupId,
  questionId,
  userDisplayName,
  userUid,
  solution,
  onUpvote,
}: {
  groupId: string
  questionId: string
  userDisplayName: string
  userUid: string | null
  solution: any
  onUpvote: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const { data: allComments = [] } = useSWRSubscription(
    solution?.id ? paths.solutionComments(groupId, questionId, solution.id) : null,
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => {
        const val = snap.val() || {}
        const arr: RTDBComment[] = Object.values(val)
        arr.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        next(null, arr)
      })
      return () => unsub()
    },
  )

  const generalComments = useMemo(() => {
    return (allComments as RTDBComment[])
      .filter((c) => !c.lineNumber)
      .map((c) => ({
        id: c.id,
        author: c.author,
        content: c.content,
        createdAt: c.createdAt,
        upvotes: c.upvotes,
        parentId: c.parentId || null,
      }))
  }, [allComments])

  const inlineCommentsMap = useMemo(() => {
    return (allComments as RTDBComment[])
      .filter((c) => c.lineNumber)
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

  async function addInlineComment(line: number, text: string) {
    if (!userUid) return
    const commentRef = ref(db, paths.solutionComments(groupId, questionId, solution.id))
    const newCommentRef = push(commentRef)
    const cid = newCommentRef.key!

    await set(newCommentRef, {
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
    const commentRef = ref(db, paths.solutionComments(groupId, questionId, solution.id))
    const newCommentRef = push(commentRef)
    const cid = newCommentRef.key!

    await set(newCommentRef, {
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
    if (!userUid) return
    
    const userUpvotePath = `${paths.solutionComments(groupId, questionId, solution.id)}/${commentId}/userUpvotes/${userUid}`
    const userUpvoteRef = ref(db, userUpvotePath)
    
    const res = await runTransaction(userUpvoteRef, (curr) => (curr ? null : true))
    const nowValue = res.snapshot.val()
    const added = !!nowValue
    
    const countPath = `${paths.solutionComments(groupId, questionId, solution.id)}/${commentId}/upvotes`
    const countRef = ref(db, countPath)
    
    await runTransaction(countRef, (curr) => {
      const base = typeof curr === "number" ? curr : 0
      return added ? base + 1 : Math.max(0, base - 1)
    })
  }

  const solutionExpired = solution.expiresAt && solution.expiresAt < Date.now()
  const totalCommentCount = allComments.length

  return (
    <div className={`rounded-md border p-3 ${solutionExpired ? "opacity-50" : ""}`}>
      <CollapsibleSection
        title={
          <span className="text-base font-semibold">
            Solution by {solution.authorName}
            <span className="ml-2 text-sm text-muted-foreground font-normal">
              ({solution.language}, {solution.upvotesCount ?? 0} Upvotes)
            </span>
          </span>
        }
        defaultOpen={false}
      >
        <div className="text-sm border-t pt-2 mt-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground">{solution.language}</div>
              <TimeRemaining expiresAt={solution.expiresAt} />
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
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
              onAddInlineComment={addInlineComment}
            />
          </div>

          <div className={`gap-4 ${expanded ? "flex flex-col" : "grid md:grid-cols-3"}`}>
      {/* Approach */}
      <div className="rounded-md border p-3">
        <div className="mb-1 text-xs text-muted-foreground">Approach</div>
        <div
          className={`prose prose-sm max-w-none dark:prose-invert transition-all ${
            expanded ? "max-h-full" : "max-h-32 overflow-hidden"
          }`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {solution.approach || ""}
          </ReactMarkdown>
        </div>
        {solution.approach && solution.approach.length > 300 && (
          <button
            className="mt-2 text-xs text-blue-600 hover:underline"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "View Less" : "View More"}
          </button>
        )}
      </div>

      {/* T.C. */}
      <div className="rounded-md border p-3">
        <div className="mb-1 text-xs text-muted-foreground">T.C. (LaTeX)</div>
        <div className="text-sm break-words">{solution.tc}</div>
      </div>

      {/* S.C. */}
      <div className="rounded-md border p-3">
        <div className="mb-1 text-xs text-muted-foreground">S.C. (LaTeX)</div>
        <div className="text-sm break-words">{solution.sc}</div>
      </div>
    </div>



          {solutionExpired ? (
            <div className="mt-3 text-sm font-semibold text-red-500">
              Solution expired. Upvoting and commenting are disabled.
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={onUpvote}>
                Upvote ({solution.upvotesCount ?? 0})
              </Button>
            </div>
          )}

          <div className="mt-4 border-t pt-4">
            <CollapsibleSection
              title="Comments"
              count={totalCommentCount}
              defaultOpen={false}
            >
              <CommentsThread
                comments={generalComments}
                onAdd={addComment}
                onUpvote={upvoteComment}
              />
            </CollapsibleSection>
          </div>
        </div>
      </CollapsibleSection>
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

function GroupLeaderboard({ groupId }: { groupId: string }) {
  const { data: stats } = useSWRSubscription(groupId ? paths.groupStats(groupId) : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() as GroupStats | null))
    return () => unsub()
  })

  const { data: members } = useSWRSubscription(groupId ? paths.groupMembers(groupId) : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val() as GroupMembers | null))
    return () => unsub()
  })

  const [userNames, setUserNames] = useState<NameMap>({})

  const rows = useMemo(() => {
    if (!stats) return []

    const now = Date.now()
    const twentyFourHours = 24 * 60 * 60 * 1000

    const statsEntries = Object.entries(stats) as [string, UserSubmissionStats | undefined][]

    const data = statsEntries
      .map(([uid, s]) => ({
        uid,
        submissions: s?.submissions ?? 0,
        lastSubmissionAt: s?.lastSubmissionAt ?? 0,
      }))
      .filter(s => now - s.lastSubmissionAt < twentyFourHours) // Keep only recent submissions

    data.sort((a, b) => b.submissions - a.submissions || b.lastSubmissionAt - a.lastSubmissionAt)
    return data
  }, [stats])

  const ratioMetric = useMemo(() => {
    const uniqueSubmitters = stats ? Object.keys(stats).length : 0
    const totalUsers = members ? Object.keys(members).length : 0

    if (totalUsers === 0) {
      return { display: "N/A", tooltip: "No members in group." }
    }

    const percentage = ((uniqueSubmitters / totalUsers) * 100).toFixed(0)
    return {
      display: `${uniqueSubmitters}/${totalUsers} (${percentage}%)`,
      tooltip: `${uniqueSubmitters} unique users submitted / ${totalUsers} total group members.`,
    }
  }, [stats, members])

  const getDisplayName = (uid: string) => userNames[uid] || uid

  useEffect(() => {
    if (!stats) return
    const uidsInStats = Object.keys(stats)
    const uidsToFetch = uidsInStats.filter(uid => !userNames[uid])

    if (uidsToFetch.length === 0) return

    const listeners: (() => void)[] = []

    uidsToFetch.forEach(uid => {
      const userRef = ref(db, `users/${uid}/displayName`)
      const listener = onValue(userRef, (snap) => {
        const name = snap.val()
        if (name) {
          setUserNames(prev => ({ ...prev, [uid]: name }))
        } else {
          setUserNames(prev => ({ ...prev, [uid]: "Unknown User" }))
        }
      })
      listeners.push(listener)
    })

    return () => {
      listeners.forEach(unsub => unsub())
    }
  }, [stats, userNames])

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium">Group Metrics</h2>
        <div 
          className="text-sm text-muted-foreground cursor-default"
          title={ratioMetric.tooltip}
        >
          Submissions: <span className="font-semibold text-primary">{ratioMetric.display}</span>
        </div>
      </div>

      {rows.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-4">User</th>
                <th className="py-2">Last submission</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.uid} className="border-t">
                  <td className="py-2 pr-4">
                    <a className="underline" href={`/contact/${r.uid}`}>
                      {getDisplayName(r.uid)} 
                    </a>
                  </td>
                  <td className="py-2">{r.lastSubmissionAt ? new Date(r.lastSubmissionAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 text-sm text-muted-foreground">No submissions in the last 24 hours.</div>
      )}
    </div>
  )
}

function TimeRemaining({ expiresAt }: { expiresAt?: number | null }) {
  if (!expiresAt) return null

  const [remaining, setRemaining] = useState(() => {
    if (!expiresAt) return 0
    return Math.max(0, expiresAt - Date.now())
  })

  useEffect(() => {
    if (remaining === 0) return

    const interval = setInterval(() => {
      const newRemaining = Math.max(0, expiresAt - Date.now())
      setRemaining(newRemaining)
      if (newRemaining === 0) {
        clearInterval(interval)
      }
    }, 1000 * 60) // Update every minute

    return () => clearInterval(interval)
  }, [expiresAt, remaining])

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
