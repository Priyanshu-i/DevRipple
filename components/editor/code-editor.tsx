"use client"

import Editor from "react-simple-code-editor"
import { highlight, languages } from "prismjs"
import "prismjs/themes/prism.css"
import "prismjs/components/prism-python"
import "prismjs/components/prism-java"
import "prismjs/components/prism-c"
import "prismjs/components/prism-cpp"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-typescript"

type Props = {
  value: string
  onChange: (code: string) => void
  language: "python" | "java" | "cpp" | "c" | "javascript" | "typescript"
  placeholder?: string
  className?: string
}

export function CodeEditor({ value, onChange, language, placeholder, className }: Props) {
  return (
    <div className={className}>
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={(code) => highlight(code, languages[language] || languages.javascript, language)}
        padding={12}
        textareaId="codeArea"
        className="rounded-md border bg-card text-sm"
        textareaClassName="font-mono leading-6"
        placeholder={placeholder}
      />
    </div>
  )
}
