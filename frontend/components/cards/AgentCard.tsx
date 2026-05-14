"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AgentBadge } from "@/components/shared/AgentBadge"
import { StatusDot } from "@/components/shared/StatusDot"
import { StreamingText } from "@/components/shared/StreamingText"
import type { AgentState } from "@/store/tripStore"

const AGENT_COLORS: Record<string, string> = {
  destination: "#E8652A",
  flight: "#2A6EE8",
  hotel: "#2AAE8C",
  weather: "#C49A00",
  itinerary: "#8B3A8B",
}

interface Props {
  agent: string
  state: AgentState
}

export function AgentCard({ agent, state }: Props) {
  const color = AGENT_COLORS[agent] ?? "#A89E94"
  const [elapsed, setElapsed] = useState(0)
  const [pulseBorder, setPulseBorder] = useState(false)
  const prevToolCount = useRef(0)

  useEffect(() => {
    if (!state.startedAt || state.status === "complete" || state.status === "error") return
    const id = setInterval(() => setElapsed(Date.now() - (state.startedAt ?? 0)), 1000)
    return () => clearInterval(id)
  }, [state.startedAt, state.status])

  useEffect(() => {
    if (state.toolCalls.length > prevToolCount.current) {
      prevToolCount.current = state.toolCalls.length
      setPulseBorder(true)
      const id = setTimeout(() => setPulseBorder(false), 300)
      return () => clearTimeout(id)
    }
  }, [state.toolCalls.length])

  const elapsedStr =
    state.startedAt && state.status !== "idle"
      ? `${Math.floor(elapsed / 1000)}s`
      : ""

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        borderLeft: `3px solid ${pulseBorder ? color : color + "99"}`,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        overflow: "hidden",
        transition: "border-color 0.3s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid #E8E2D9" }}
      >
        <StatusDot status={state.status} agent={agent} />
        <AgentBadge agent={agent} />
        {state.toolCalls.length > 0 && (
          <span style={{ fontSize: 11, color: "#A89E94", marginLeft: 2 }}>
            {state.toolCalls.length} searches
          </span>
        )}
        {elapsedStr && (
          <span
            className="ml-auto"
            style={{
              fontSize: 11,
              color: "#A89E94",
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            {elapsedStr}
          </span>
        )}
      </div>

      {/* Scrollable body — tool calls + output, capped at 200px */}
      <ScrollArea style={{ maxHeight: 200 }}>
        <div className="px-3 py-2 space-y-1">
          {state.toolCalls.map((call, i) => (
            <p
              key={i}
              style={{
                fontSize: 11,
                color: "#A89E94",
                fontFamily: "var(--font-jetbrains-mono)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              &gt; {call}
            </p>
          ))}

          {(state.output || state.status === "thinking") && (
            <div style={{ paddingTop: state.toolCalls.length > 0 ? 6 : 0 }}>
              <StreamingText text={state.output} status={state.status} />
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  )
}
