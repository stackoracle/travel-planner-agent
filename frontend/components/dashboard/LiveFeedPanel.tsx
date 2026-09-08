"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { AgentCard } from "@/components/cards/AgentCard";
import { useTripStore } from "@/store/tripStore";

const AGENT_ORDER = ["weather", "destination", "flight", "hotel", "itinerary"];

export function LiveFeedPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // useShallow: re-renders ONLY when the list of active agents changes (agent starts/completes),
  // NOT on every token - tokens only change s.agents[x].output, not which agents are active
  const activeAgents = useTripStore(
    useShallow((s) =>
      AGENT_ORDER.filter((a) => s.agents[a]?.status !== "idle"),
    ),
  );

  // Scroll to the newest card whenever one appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [activeAgents.length]);

  return (
    <div
      className="flex items-center gap-6 px-6 py-3"
      style={{
        backgroundColor: "var(--tp-bg)",
        borderTop: "1px solid var(--tp-border)",
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
        Live Feed
      </p>

      <div
        ref={scrollRef}
        className="flex-1 min-w-0 flex gap-3 overflow-x-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--tp-border) transparent",
        }}
      >
        <AnimatePresence initial={false}>
          {activeAgents.map((agent) => (
            // AgentCard subscribes to its own slice - only that card re-renders on its tokens
            <div key={agent} className="shrink-0" style={{ width: 320 }}>
              <AgentCard agent={agent} />
            </div>
          ))}
        </AnimatePresence>

        {activeAgents.length === 0 && (
          <p
            className="py-1 shrink-0"
            style={{ fontSize: 13, color: "var(--tp-text-muted)" }}
          >
            Agents will appear here as they start…
          </p>
        )}
      </div>
    </div>
  );
}
