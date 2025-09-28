"use client"

import { useMemo, useState } from "react"
import { highlight, languages } from "prismjs"
import "prismjs/themes/prism.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  code: string
  language: string
  onAddInlineComment?: (line: number, text: string) => Promise<void>
  inlineComments?: Record<number, Array<{ id: string; text: string; author: string }>>
}

export function CodeViewer({ code, language, onAddInlineComment, inlineComments = {} }: Props) {
  const html = useMemo(
    () => highlight(code, (languages as any)[language] || languages.javascript, language),
    [code, language],
  )
  const lines = useMemo(() => code.split("\n"), [code])
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const [commentText, setCommentText] = useState("")

  return (
    <div className="rounded-md border bg-card">
      <div className="grid grid-cols-[3rem_1fr] gap-0">
        <div className="select-none border-r bg-muted/50 p-2 text-right text-xs text-muted-foreground">
          {lines.map((_, i) => (
            <div key={i} className="cursor-pointer py-0.5" onClick={() => setActiveLine(i + 1)}>
              {i + 1}
            </div>
          ))}
        </div>
        <pre className="overflow-x-auto p-2 text-sm leading-6">
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>

      {activeLine && onAddInlineComment && (
        <div className="border-t p-2">
          <div className="mb-2 text-xs text-muted-foreground">Add comment on line {activeLine}</div>
          <div className="flex items-center gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
            />
            <Button
              size="sm"
              onClick={async () => {
                if (!commentText.trim()) return
                await onAddInlineComment(activeLine, commentText.trim())
                setCommentText("")
              }}
            >
              Comment
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setActiveLine(null)}>
              Cancel
            </Button>
          </div>
          {inlineComments[activeLine]?.length ? (
            <div className="mt-3 space-y-2">
              {inlineComments[activeLine].map((c) => (
                <div key={c.id} className="rounded-md border bg-muted/40 p-2 text-sm">
                  <div className="text-xs text-muted-foreground">{c.author}</div>
                  <div>{c.text}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
