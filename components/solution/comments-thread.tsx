"use client"

import { useState, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ThumbsUp, MessageCircle } from "lucide-react" // Icons for Upvote and Reply

// --- Type Definitions ---

type Comment = {
  id: string
  author: string
  content: string
  createdAt: number // Use Date for display in a real app, but sticking to number for now
  upvotes?: number
  parentId?: string | null
}

type Props = {
  comments: Comment[]
  onAdd: (content: string, parentId?: string | null) => Promise<void>
  onUpvote?: (id: string) => Promise<void>
  disabled?: boolean
}

// --- Utility: Get a YouTube-like profile color for a user ---
// A simple way to simulate YouTube's colored profile initial or placeholder
const stringToColor = (str: string) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  let color = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    color += ('00' + value.toString(16)).slice(-2)
  }
  return color
}

// --- Comment Input Component (Reused for Top-level and Replies) ---

function CommentInput({
  placeholder,
  buttonText,
  onSubmit,
  disabled = false,
  isReply = false,
  onCancel, // Added for reply functionality
}: {
  placeholder: string
  buttonText: string
  onSubmit: (content: string) => Promise<void>
  disabled?: boolean
  isReply?: boolean
  onCancel?: () => void
}) {
  const [value, setValue] = useState("")

  const handleSubmit = async () => {
    const trimmedValue = value.trim()
    if (!trimmedValue) return
    await onSubmit(trimmedValue)
    setValue("")
    if (onCancel) onCancel() // Close reply box on successful submit
  }

  const handleCancel = () => {
    setValue("")
    if (onCancel) onCancel()
  }

  const isButtonDisabled = !value.trim() || disabled

  return (
    <div className={`flex flex-col ${isReply ? 'mt-2' : 'mb-6'}`}>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={isReply ? 1 : 2}
        className={`resize-none ${isReply ? 'rounded-b-none' : ''}`}
        disabled={disabled}
      />
      {/* YouTube-like Action Bar */}
      {(value.trim() || isReply) && (
        <div className={`flex justify-end gap-2 p-2 ${isReply ? 'bg-background/80' : 'bg-background'} border-b border-x rounded-b-md`}>
          {onCancel && ( // Only show Cancel for replies or when input is focused/filled
             <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={disabled}
             >
                Cancel
             </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isButtonDisabled}
          >
            {buttonText}
          </Button>
        </div>
      )}
      {/* If not a reply, always show the action bar as soon as there's input */}
      {!isReply && value.trim() && (
        <div className="mt-2 flex justify-end gap-2">
           {/* You might add a 'Cancel' button here too if desired */}
        </div>
      )}
    </div>
  )
}

// --- Individual Comment Item Component ---

function CommentItem({
  comment,
  replies, // Now explicitly passing only direct replies
  onAdd,
  onUpvote,
}: {
  comment: Comment
  replies: Comment[]
  onAdd: (content: string, parentId?: string | null) => Promise<void>
  onUpvote?: (id: string) => Promise<void>
}) {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [showReplies, setShowReplies] = useState(false)

  const profileColor = useMemo(() => stringToColor(comment.author), [comment.author])
  const profileInitial = comment.author.charAt(0).toUpperCase()

  // Simplified YouTube timestamp simulation
  const timeAgo = (date: number) => {
    const seconds = Math.floor((Date.now() - date) / 1000)
    if (seconds < 60) return `${seconds} seconds ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hours ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
  }

  const handleReplySubmit = async (content: string) => {
    await onAdd(content, comment.id)
    setShowReplyInput(false) // Hide input after submission
    setShowReplies(true) // Show the replies section to see the new reply
  }

  return (
    <div className="flex gap-3">
      {/* Profile Avatar/Initial */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: profileColor }}
      >
        {profileInitial}
      </div>

      <div className="flex-grow">
        {/* Header: Author & Time */}
        <div className="text-sm font-medium">
          <span className="font-semibold">{comment.author}</span>
          <span className="ml-2 text-xs text-gray-500">{timeAgo(comment.createdAt)}</span>
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none break-words leading-snug">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}>{comment.content}</ReactMarkdown>
        </div>

        {/* Actions: Upvote & Reply */}
        <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
          {/* Upvote Button */}
          <button
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            onClick={onUpvote ? () => onUpvote(comment.id) : undefined}
            disabled={!onUpvote}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{comment.upvotes ?? 0}</span>
          </button>

          {/* Reply Button */}
          {comment.parentId === undefined || comment.parentId === null ? (
            <button
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
              onClick={() => setShowReplyInput((prev) => !prev)}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Reply</span>
            </button>
          ) : null}
        </div>

        {/* Reply Input */}
        {showReplyInput && (
          <div className="mt-3 flex gap-3">
             <div className="h-10 w-10 shrink-0"></div> {/* Spacer for the avatar column */}
             <CommentInput
                placeholder="Add a public reply..."
                buttonText="Reply"
                onSubmit={handleReplySubmit}
                isReply={true}
                onCancel={() => setShowReplyInput(false)}
             />
          </div>
        )}


        {/* Replies Thread */}
        {replies.length > 0 && (
          <div className="mt-4">
            {/* Toggle to show/hide replies */}
            <button
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              onClick={() => setShowReplies((prev) => !prev)}
            >
               {showReplies ? 'Hide replies' : `View ${replies.length} replies`}
            </button>

            {/* Display Replies */}
            {showReplies && (
              <div className="mt-3 space-y-3">
                {replies.map((reply) => (
                  // Replies are rendered using the same CommentItem, but they won't show
                  // the Reply button or any nested replies due to the two-level restriction.
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    replies={[]} // Replies array is empty to prevent further nesting
                    onAdd={onAdd}
                    onUpvote={onUpvote}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Main Comments Thread Component ---

export function CommentsThread({ comments, onAdd, onUpvote, disabled }: Props) {
  // Use useMemo to prevent unnecessary recalculations of roots and children on every render
  const { roots, childrenMap } = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId)
    const childrenMap = comments.reduce<Record<string, Comment[]>>((acc, c) => {
      if (c.parentId) {
        acc[c.parentId] = acc[c.parentId] || []
        acc[c.parentId].push(c)
      }
      return acc
    }, {})
    // Sort root comments by upvotes (a common YouTube practice)
    roots.sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0))
    // Optionally, sort replies by time
    Object.values(childrenMap).forEach(replies => {
        replies.sort((a, b) => a.createdAt - b.createdAt)
    })
    return { roots, childrenMap }
  }, [comments])


  return (
    <div className="space-y-6 max-w-3xl mx-auto p-4">
      {/* Total Comments Header (YouTube Style) */}
      <h2 className="text-xl font-bold">{comments.length} Comments</h2>
      
      {/* Top-level Comment Input */}
      <CommentInput
        placeholder="Add a public comment with Markdown and LaTeX..."
        buttonText="Comment"
        onSubmit={(content) => onAdd(content, null)}
        disabled={disabled}
      />

      {/* Comment List */}
      <div className="space-y-6">
        {roots.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            replies={childrenMap[c.id] || []} // Pass only the direct replies
            onAdd={onAdd}
            onUpvote={onUpvote}
          />
        ))}
      </div>
    </div>
  )
}