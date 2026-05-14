"use client"

import { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { AgentStatus } from "@/store/tripStore"

interface Props {
  text: string
  status: AgentStatus
  mono?: boolean
  className?: string
}

// Rendered once when agent completes — memoised so it never re-renders during streaming
const MarkdownBody = memo(function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="prose-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  )
})

const CURSOR = (
  <span
    style={{
      display: "inline-block",
      fontFamily: "var(--font-jetbrains-mono)",
      fontSize: 13,
      lineHeight: 1,
      animation: "blink 1s step-end infinite",
      color: "#E8652A",
      marginLeft: 1,
    }}
  >
    |
  </span>
)

export function StreamingText({ text, status, mono = false, className }: Props) {
  const isLive = status === "active" || status === "thinking"
  const isDone = status === "complete" || status === "error"

  if (mono) {
    return (
      <span
        className={className}
        style={{
          fontFamily: "var(--font-jetbrains-mono)",
          fontSize: 12,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "#6B6459",
        }}
      >
        {text}
        {isLive && CURSOR}
      </span>
    )
  }

  // During streaming: plain Lora text (no markdown parsing per token)
  // After complete: full markdown render (once, memoised)
  if (isDone && text) {
    return <MarkdownBody text={text} />
  }

  return (
    <div className={`prose-content${className ? ` ${className}` : ""}`}>
      {text && (
        <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{text}</p>
      )}
      {isLive && CURSOR}
    </div>
  )
}
