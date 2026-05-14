"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence } from "framer-motion"
import { useShallow } from "zustand/react/shallow"
import { AgentCard } from "@/components/cards/AgentCard"
import { useTripStore } from "@/store/tripStore"

const AGENT_ORDER = ["destination", "flight", "hotel", "weather", "itinerary"]

export function LiveFeedPanel() {
  const scrollRef = useRef<HTMLDivElement>(null)

  // useShallow: re-renders ONLY when the list of active agents changes (agent starts/completes),
  // NOT on every token — tokens only change s.agents[x].output, not which agents are active
  const activeAgents = useTripStore(
    useShallow((s) =>
      AGENT_ORDER.filter((a) => s.agents[a]?.status !== "idle")
    )
  )

  // Scroll to bottom whenever a new agent card appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeAgents.length])

  // Auto-scroll outer panel as card content grows during streaming
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new MutationObserver(() => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      if (nearBottom) el.scrollTop = el.scrollHeight
    })
    observer.observe(el, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className="flex flex-col h-full"
      style={{ borderLeft: "1px solid #E8E2D9" }}
    >
      {/* Panel header */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid #E8E2D9", backgroundColor: "#FAFAF8" }}
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
          Live Feed
        </p>
      </div>

      {/* Scrollable card list — min-h-0 is critical for flex shrink to work */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#E8E2D9 transparent" }}
      >
        <div className="p-3 space-y-3">
          <AnimatePresence initial={false}>
            {activeAgents.map((agent) => (
              // AgentCard subscribes to its own slice — only that card re-renders on its tokens
              <AgentCard key={agent} agent={agent} />
            ))}
          </AnimatePresence>

          {activeAgents.length === 0 && (
            <p
              className="text-center pt-8"
              style={{ fontSize: 13, color: "#A89E94" }}
            >
              Agents will appear here as they start…
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
