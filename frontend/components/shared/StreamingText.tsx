"use client"

import { useDeferredValue } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { AgentStatus } from "@/store/tripStore"

interface Props {
  text: string
  status: AgentStatus
  mono?: boolean
  className?: string
}

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
  // Defer markdown re-parses so rapid token bursts don't block the main thread.
  // React renders with the previous (stale) text first, then catches up when idle.
  const deferredText = useDeferredValue(text)

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

  return (
    <div className={`prose-content${className ? ` ${className}` : ""}`}>
      {deferredText && (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{deferredText}</ReactMarkdown>
      )}
      {isLive && CURSOR}
    </div>
  )
}
