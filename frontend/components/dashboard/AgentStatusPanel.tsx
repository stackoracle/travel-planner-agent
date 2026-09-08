"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { StatusDot } from "@/components/shared/StatusDot"
import { AgentBadge } from "@/components/shared/AgentBadge"
import { useTripStore } from "@/store/tripStore"

const AGENTS = ["weather", "destination", "flight", "hotel", "itinerary"]

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
    <span style={{ fontSize: 11, color: "var(--tp-text-muted)", fontFamily: "var(--font-jetbrains-mono)" }}>
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
      className="flex items-center gap-6 px-6 py-3"
      style={{
        backgroundColor: "var(--tp-bg)",
        borderBottom: "1px solid var(--tp-border)",
      }}
    >
      <p
        className="shrink-0"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--tp-text-muted)",
        }}
      >
        Agents
      </p>

      <div className="flex items-center justify-between gap-6 flex-1 min-w-0 overflow-x-auto">
        {AGENTS.map((agent) => {
          const state = agents[agent]
          const status = state?.status ?? "idle"
          const stopped = status === "complete" || status === "error"
          return (
            <div key={agent} className="flex items-center gap-2 shrink-0">
              <StatusDot status={status} agent={agent} />
              <div className="min-w-0">
                <AgentBadge agent={agent} />
                <p style={{ fontSize: 11, color: "var(--tp-text-muted)", marginTop: 1 }}>
                  {STATUS_TEXT[status] ?? status}
                </p>
              </div>
              {state?.toolCalls?.length ? (
                <span style={{ fontSize: 10, color: "var(--tp-text-muted)" }}>
                  {state.toolCalls.length} ✦
                </span>
              ) : null}
              <ElapsedTimer startedAt={state?.startedAt ?? null} stopped={stopped} />
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0" style={{ minWidth: 150 }}>
        <span style={{ fontSize: 11, color: "var(--tp-text-muted)" }}>Overall</span>
        <Progress
          value={progress}
          className="h-1.5 w-20"
          style={{ backgroundColor: "var(--tp-border)" }}
        />
        <span style={{ fontSize: 11, color: "var(--tp-text-muted)" }}>{Math.round(progress)}%</span>
      </div>
    </div>
  )
}
