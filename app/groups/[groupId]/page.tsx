"use client"

import { useParams } from "next/navigation"
import useSWRSubscription from "swr/subscription"
import { db } from "@/lib/firebase"
import { onValue, ref, runTransaction, set, serverTimestamp, push, update } from "firebase/database"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CodeViewer } from "@/components/solution/code-viewer"
import { CommentsThread } from "@/components/solution/comments-thread"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {ChevronUp, ChevronDown, Heart, MessageCircle, Bookmark, ExternalLink, Clock, User, Code, TrendingUp, Plus, CreditCard as Edit3, Calendar, Users } from "lucide-react"

export default function GroupPage() {
  const params = useParams<{ groupId: string }>()
  const groupId = params.groupId
  const { user } = useAuth()

  const { data: group } = useSWRSubscription(groupId ? `groups/${groupId}` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
    return () => unsub()
  })

  const { data: solutions } = useSWRSubscription(groupId ? `solutions/${groupId}` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => {
      const val = snap.val() || {}
      const arr = Object.values(val) as any[]
      arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      next(null, arr)
    })
    return () => unsub()
  })

  const { data: todaysQuestion } = useSWRSubscription(
    group?.todaysQuestionId ? `groupQuestions/${groupId}/${group.todaysQuestionId}` : null,
    (key, { next }) => {
      const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
      return () => unsub()
    },
  )

  const isAdmin = user && group?.adminUid === user.uid

  async function toggleBookmark(solutionId: string) {
    if (!user) return
    const bmRef = ref(db, `bookmarks/${user.uid}/${solutionId}`)
    await runTransaction(bmRef, (curr) => (curr ? null : true))
  }

  async function toggleUpvote(solutionId: string) {
    if (!user) return
    const voteRef = ref(db, `upvotes/solutions/${solutionId}/${user.uid}`)
    const res = await runTransaction(voteRef, (curr) => (curr ? null : true))
    const nowValue = res.snapshot.val()
    const added = !!nowValue
    const countRef = ref(db, `solutions/${groupId}/${solutionId}/upvotesCount`)
    await runTransaction(countRef, (curr) => {
      const base = typeof curr === "number" ? curr : 0
      return added ? base + 1 : Math.max(0, base - 1)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    {group?.name ?? "Loading..."}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Active Group</span>
                  </div>
                </div>
              </div>
              {group?.description && (
                <p className="max-w-2xl text-gray-600 leading-relaxed">{group.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg transition-all duration-200 hover:shadow-xl">
                <Link href={`/groups/${groupId}/submit`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Solution
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Today's Question Section */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Today's Challenge</h2>
                      <p className="text-sm text-gray-600">Daily coding problem</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                      Admin
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {todaysQuestion ? (
                  <div className="space-y-4">
                    {todaysQuestion.title && (
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{todaysQuestion.title}</h3>
                        {todaysQuestion.link && (
                          <Button asChild variant="outline" size="sm">
                            <a href={todaysQuestion.link} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Problem
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                    {todaysQuestion.prompt && (
                      <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-50 prose-pre:border">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{todaysQuestion.prompt}</ReactMarkdown>
                      </div>
                    )}
                    {isAdmin && (
                      <div className="pt-4 border-t">
                        <AdminQuestionForm
                          groupId={groupId}
                          existing={todaysQuestion}
                          onSaved={async (qid) => {
                            await update(ref(db, `groups/${groupId}`), { todaysQuestionId: qid })
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Clock className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 mb-4">No challenge posted yet today</p>
                    {isAdmin && (
                      <AdminQuestionForm
                        groupId={groupId}
                        onSaved={async (qid) => {
                          await update(ref(db, `groups/${groupId}`), { todaysQuestionId: qid })
                        }}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Solutions Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-teal-500 text-white">
                    <Code className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Community Solutions</h2>
                    <p className="text-sm text-gray-600">{solutions?.length || 0} submissions</p>
                  </div>
                </div>
              </div>

              {solutions?.length ? (
                <div className="space-y-6">
                  {solutions.map((s: any) => (
                    <SolutionItem
                      key={s.id}
                      groupId={groupId}
                      userDisplayName={user?.displayName ?? "Anonymous"}
                      userUid={user?.uid ?? null}
                      solution={s}
                      onUpvote={() => toggleUpvote(s.id)}
                      onBookmark={() => toggleBookmark(s.id)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-gray-200">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Code className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-center mb-4">No solutions submitted yet</p>
                    <Button asChild variant="outline">
                      <Link href={`/groups/${groupId}/submit`}>
                        Be the first to submit!
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">Group Stats</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Solutions</span>
                    <Badge variant="secondary">{solutions?.length || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Active Challenge</span>
                    <Badge variant={todaysQuestion ? "default" : "outline"}>
                      {todaysQuestion ? "Yes" : "No"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  const [isExpanded, setIsExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)

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
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
      <CardHeader 
        className="border-b bg-gradient-to-r from-slate-50 to-gray-50 cursor-pointer hover:bg-gradient-to-r hover:from-slate-100 hover:to-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-medium">
              {solution.authorName?.charAt(0) || "A"}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{solution.authorName}</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Code className="h-3 w-3" />
                <Badge variant="outline" className="text-xs">
                  {solution.language}
                </Badge>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-500">{comments.length} comments</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">{solution.upvotesCount ?? 0}</span>
              </div>
            </div>
            {solution.problemLink ? (
              <Button asChild variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <a href={solution.problemLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Problem
                </a>
              </Button>
            ) : (
              <Badge variant="secondary">Custom</Badge>
            )}
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-6 space-y-6">
        {/* Code Viewer */}
        <div className="rounded-lg border bg-gray-50/50 overflow-hidden">
          <CodeViewer
            code={solution.code}
            language={solution.language}
            inlineComments={inline}
            onAddInlineComment={addInlineComment}
          />
        </div>

        {/* Solution Details */}
        <div className="space-y-4">
          {/* Approach */}
          {solution.approach && (
            <div className="rounded-lg border bg-blue-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Edit3 className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Approach</span>
              </div>
              <div className="prose prose-sm prose-blue max-w-none prose-headings:text-blue-900 prose-p:text-blue-800 prose-code:bg-blue-100 prose-code:text-blue-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{solution.approach}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Complexity Analysis */}
          <div className="grid gap-4 md:grid-cols-2">
            {solution.tc && (
              <div className="rounded-lg border bg-green-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900 text-sm">Time Complexity</span>
                </div>
                <code className="text-sm text-green-800 bg-green-100 px-2 py-1 rounded">
                  {solution.tc}
                </code>
              </div>
            )}
            {solution.sc && (
              <div className="rounded-lg border bg-purple-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-900 text-sm">Space Complexity</span>
                </div>
                <code className="text-sm text-purple-800 bg-purple-100 px-2 py-1 rounded">
                  {solution.sc}
                </code>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onUpvote}
              className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <Heart className="mr-2 h-4 w-4" />
              {solution.upvotesCount ?? 0}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBookmark}
              className="hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200 transition-colors"
            >
              <Bookmark className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            
            <Button onClick={() => setShowComments(!showComments)}><MessageCircle className="h-4 w-4" /> {comments.length} comments</Button>
          </div>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="border-t pt-6">
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
        )}
      </CardContent>
      )}
    </Card>
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
  const [isExpanded, setIsExpanded] = useState(!existing)

  if (!isExpanded) {
    return (
      <Button variant="outline" onClick={() => setIsExpanded(true)} className="w-full">
        <Edit3 className="mr-2 h-4 w-4" />
        {existing ? "Edit Question" : "Post Question"}
      </Button>
    )
  }

  return (
    <Card className="border border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-blue-900">
            {existing ? "Edit Today's Question" : "Post Today's Question"}
          </h4>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Two Sum (Easy)"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Problem Link</label>
            <input
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://leetcode.com/problems/..."
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Problem Description (Markdown)</label>
          <textarea
            className="h-40 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the problem, provide examples and constraints..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setIsExpanded(false)}>
            Cancel
          </Button>
          <Button
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
              setIsExpanded(false)
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {existing ? "Save Changes" : "Post Question"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}