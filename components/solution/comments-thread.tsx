"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Comment = {
  id: string
  author: string
  content: string
  createdAt: number
  upvotes?: number
  parentId?: string | null
}

type Props = {
  comments: Comment[]
  onAdd: (content: string, parentId?: string | null) => Promise<void>
  onUpvote?: (id: string) => Promise<void>
}

export function CommentsThread({ comments, onAdd, onUpvote }: Props) {
  const [value, setValue] = useState("")
  const roots = comments.filter((c) => !c.parentId)
  const childrenMap = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parentId) {
      acc[c.parentId] = acc[c.parentId] || []
      acc[c.parentId].push(c)
    }
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Write a comment with Markdown and LaTeX..."
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={async () => {
              if (!value.trim()) return
              await onAdd(value.trim(), null)
              setValue("")
            }}
          >
            Comment
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        {roots.map((c) => (
          <CommentItem key={c.id} comment={c} childrenMap={childrenMap} onAdd={onAdd} onUpvote={onUpvote} />
        ))}
      </div>
    </div>
  )
}

function CommentItem({
  comment,
  childrenMap,
  onAdd,
  onUpvote,
}: {
  comment: Comment
  childrenMap: Record<string, Comment[]>
  onAdd: (content: string, parentId?: string | null) => Promise<void>
  onUpvote?: (id: string) => Promise<void>
}) {
  const [reply, setReply] = useState("")
  const kids = childrenMap[comment.id] || []
  return (
    <div className="rounded-md border p-3">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{comment.author}</span>
        <div className="flex items-center gap-2">
          <span>Upvotes: {comment.upvotes ?? 0}</span>
          {onUpvote ? (
            <button className="underline" onClick={() => onUpvote(comment.id)}>
              Upvote
            </button>
          ) : null}
        </div>
      </div>
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}>{comment.content}</ReactMarkdown>
      </div>
      <div className="mt-2">
        <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply..." />
        <div className="mt-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              if (!reply.trim()) return
              await onAdd(reply.trim(), comment.id)
              setReply("")
            }}
          >
            Reply
          </Button>
        </div>
      </div>
      {kids.length ? (
        <div className="mt-3 space-y-2 pl-4">
          {kids.map((k) => (
            <CommentItem key={k.id} comment={k} childrenMap={childrenMap} onAdd={onAdd} onUpvote={onUpvote} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
