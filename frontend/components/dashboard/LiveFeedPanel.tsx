"use client"

import { AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AgentCard } from "@/components/cards/AgentCard"
import { useTripStore } from "@/store/tripStore"

const AGENT_ORDER = ["destination", "flight", "hotel", "weather", "itinerary"]

export function LiveFeedPanel() {
  const agents = useTripStore((s) => s.agents)

  const activeAgents = AGENT_ORDER.filter(
    (a) => agents[a] && agents[a]!.status !== "idle"
  )

  return (
    <div
      className="flex flex-col h-full"
      style={{ borderLeft: "1px solid #E8E2D9" }}
    >
      <div
        className="px-4 py-3"
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

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <AnimatePresence initial={false}>
            {activeAgents.map((agent) => (
              <AgentCard key={agent} agent={agent} state={agents[agent]!} />
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
      </ScrollArea>
    </div>
  )
}
