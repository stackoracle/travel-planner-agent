"use client"

import { useEffect, useRef } from "react"
import type { AgentStatus } from "@/store/tripStore"

interface Props {
  text: string
  status: AgentStatus
  mono?: boolean
  className?: string
}

export function StreamingText({ text, status, mono = false, className }: Props) {
  const textRef = useRef<HTMLSpanElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (textRef.current) textRef.current.textContent = text
  }, [text])

  useEffect(() => {
    if (cursorRef.current) {
      cursorRef.current.style.display =
        status === "active" || status === "thinking" ? "inline" : "none"
    }
  }, [status])

  return (
    <span
      className={className}
      style={{
        fontFamily: mono ? "var(--font-jetbrains-mono)" : "var(--font-dm-sans)",
        fontSize: mono ? 12 : 14,
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      <span ref={textRef} />
      <span
        ref={cursorRef}
        style={{ display: "none", animation: "blink 1s step-end infinite" }}
      >
        |
      </span>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </span>
  )
}
