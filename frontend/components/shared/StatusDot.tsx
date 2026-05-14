"use client"

import { motion } from "framer-motion"
import type { AgentStatus } from "@/store/tripStore"

const AGENT_COLORS: Record<string, string> = {
  destination: "#E8652A",
  flight: "#2A6EE8",
  hotel: "#2AAE8C",
  weather: "#C49A00",
  itinerary: "#8B3A8B",
}

interface Props {
  status: AgentStatus
  agent: string
  size?: number
}

export function StatusDot({ status, agent, size = 12 }: Props) {
  const color = AGENT_COLORS[agent] ?? "#A89E94"
  const dim = `${size}px`

  if (status === "complete") {
    return (
      <span style={{ color, fontSize: size + 2, lineHeight: 1 }}>✓</span>
    )
  }
  if (status === "error") {
    return (
      <span style={{ color: "#ef4444", fontSize: size + 2, lineHeight: 1 }}>✗</span>
    )
  }
  if (status === "idle") {
    return (
      <span
        style={{
          display: "inline-block",
          width: dim,
          height: dim,
          borderRadius: "50%",
          border: "2px solid #A89E94",
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <motion.span
      style={{
        display: "inline-block",
        width: dim,
        height: dim,
        borderRadius: "50%",
        backgroundColor: color,
        flexShrink: 0,
      }}
      animate={
        status === "thinking"
          ? { opacity: [1, 0.25, 1] }
          : { scale: [1, 1.25, 1] }
      }
      transition={{ duration: status === "thinking" ? 0.67 : 0.5, repeat: Infinity }}
    />
  )
}
