"use client"

import { useMemo, useState } from "react"
import { highlight, languages } from "prismjs"
import "prismjs/themes/prism.css"
import "prismjs/components/prism-python"
import "prismjs/components/prism-java"
import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-typescript"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  code: string // Assuming code can technically be null/undefined from DB despite type
  language: string
  onAddInlineComment?: (line: number, text: string) => Promise<void>
  inlineComments?: Record<number, Array<{ id: string; text: string; author: string }>>
}

export function CodeViewer({ code, language, onAddInlineComment, inlineComments = {} }: Props) {
  const html = useMemo(
    () => {
      // 1. Defensively convert code to a string to prevent "Cannot read properties of undefined (reading 'length')"
      const codeString = String(code || "")
      
      // 2. Safely look up the grammar, falling back to javascript if the language is unknown
      const selectedGrammar = (languages as any)[language]
      const grammarToUse = selectedGrammar || languages.javascript
      const languageName = selectedGrammar ? language : "javascript"

      // 3. Highlight the code
      return highlight(
        codeString,
        grammarToUse,
        languageName
      )
    },
    [code, language],
  )
  
  // Also ensure `code` is a string here for `lines` calculation
  const lines = useMemo(() => String(code || "").split("\n"), [code])
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const [commentText, setCommentText] = useState("")

  return (
    <div className="rounded-md border bg-card">
      <div className="grid grid-cols-[3rem_1fr] gap-0">
        {/* Line numbers column */}
        <div className="select-none border-r bg-muted/50 p-2 text-right text-xs text-muted-foreground">
          {lines.map((_, i) => (
            <div key={i} className="cursor-pointer py-0.5" onClick={() => setActiveLine(i + 1)}>
              {i + 1}
            </div>
          ))}
        </div>
        
        {/* Code content column */}
        <pre className="overflow-x-auto p-2 text-sm leading-6">
          {/* Using the memoized and robustly generated HTML */}
          <code className={`language-${language}`} dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>

      {/* Inline comments section */}
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
