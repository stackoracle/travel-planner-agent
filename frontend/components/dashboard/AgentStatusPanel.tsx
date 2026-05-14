"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { StatusDot } from "@/components/shared/StatusDot"
import { AgentBadge } from "@/components/shared/AgentBadge"
import { useTripStore } from "@/store/tripStore"

const AGENTS = ["destination", "flight", "hotel", "weather", "itinerary"]

function ElapsedTimer({ startedAt, stopped }: { startedAt: number | null; stopped: boolean }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt || stopped) return
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000)
    return () => clearInterval(id)
  }, [startedAt, stopped])

  if (!startedAt) return null
  const secs = stopped ? Math.floor(elapsed / 1000) : Math.floor(elapsed / 1000)
  return (
    <span style={{ fontSize: 11, color: "#A89E94", fontFamily: "var(--font-jetbrains-mono)" }}>
      {secs}s
    </span>
  )
}

const STATUS_TEXT: Record<string, string> = {
  idle: "waiting",
  thinking: "thinking…",
  active: "streaming…",
  complete: "complete",
  error: "error",
}

export function AgentStatusPanel() {
  const agents = useTripStore((s) => s.agents)

  const completedCount = AGENTS.filter(
    (a) => agents[a]?.status === "complete"
  ).length
  const progress = (completedCount / AGENTS.length) * 100

  return (
    <div
      className="flex flex-col h-full p-4 gap-3"
      style={{ backgroundColor: "#FAFAF8", borderRight: "1px solid #E8E2D9" }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#A89E94",
        }}
      >
        Agents
      </p>

      <div className="flex flex-col gap-3 flex-1">
        {AGENTS.map((agent) => {
          const state = agents[agent]
          const status = state?.status ?? "idle"
          const stopped = status === "complete" || status === "error"
          return (
            <div key={agent} className="flex items-center gap-2">
              <StatusDot status={status} agent={agent} />
              <div className="flex-1 min-w-0">
                <AgentBadge agent={agent} />
                <p style={{ fontSize: 11, color: "#A89E94", marginTop: 1 }}>
                  {STATUS_TEXT[status] ?? status}
                </p>
              </div>
              {state?.toolCalls?.length ? (
                <span style={{ fontSize: 10, color: "#A89E94" }}>
                  {state.toolCalls.length} ✦
                </span>
              ) : null}
              <ElapsedTimer startedAt={state?.startedAt ?? null} stopped={stopped} />
            </div>
          )
        })}
      </div>

      <div className="mt-auto pt-3" style={{ borderTop: "1px solid #E8E2D9" }}>
        <div className="flex justify-between mb-1">
          <span style={{ fontSize: 11, color: "#A89E94" }}>Overall</span>
          <span style={{ fontSize: 11, color: "#A89E94" }}>{Math.round(progress)}%</span>
        </div>
        <Progress
          value={progress}
          className="h-1.5"
          style={{ backgroundColor: "#E8E2D9" }}
        />
      </div>
    </div>
  )
}
