"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentBadge } from "@/components/shared/AgentBadge";
import { StatusDot } from "@/components/shared/StatusDot";
import { StreamingText } from "@/components/shared/StreamingText";
import { useTripStore } from "@/store/tripStore";

const AGENT_COLORS: Record<string, string> = {
  destination: "#E8652A",
  flight: "#2A6EE8",
  hotel: "#2AAE8C",
  weather: "#C49A00",
  itinerary: "#8B3A8B",
};

interface Props {
  agent: string;
}

export function AgentCard({ agent }: Props) {
  // Each card subscribes ONLY to its own agent slice - other agents' tokens don't trigger re-renders here
  const state = useTripStore((s) => s.agents[agent]);
  const color = AGENT_COLORS[agent] ?? "#A89E94";

  const [elapsed, setElapsed] = useState(0);
  const [pulseBorder, setPulseBorder] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const prevToolCount = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !state?.startedAt ||
      state.status === "complete" ||
      state.status === "error"
    )
      return;
    const id = setInterval(
      () => setElapsed(Date.now() - (state.startedAt ?? 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [state?.startedAt, state?.status]);

  useEffect(() => {
    if ((state?.toolCalls.length ?? 0) > prevToolCount.current) {
      prevToolCount.current = state?.toolCalls.length ?? 0;
      setPulseBorder(true);
      const id = setTimeout(() => setPulseBorder(false), 300);
      return () => clearTimeout(id);
    }
  }, [state?.toolCalls.length]);

  // Auto-scroll card body to latest token
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [state?.output, state?.toolCalls.length]);

  // ESC closes fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  if (!state) return null;

  const elapsedStr =
    state.startedAt && state.status !== "idle"
      ? `${Math.floor(elapsed / 1000)}s`
      : "";

  return (
    <>
      <motion.div
        className="tp-glass"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          borderLeft: `3px solid ${pulseBorder ? color : color + "99"}`,
          backgroundColor: "var(--tp-surface)",
          borderRadius: 8,
          overflow: "hidden",
          transition: "border-color 0.3s",
          boxShadow: "var(--tp-card-shadow)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ borderBottom: "1px solid var(--tp-border)" }}
        >
          <StatusDot status={state.status} agent={agent} />
          <AgentBadge agent={agent} />
          {state.toolCalls.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--tp-text-muted)", marginLeft: 2 }}>
              {state.toolCalls.length} searches
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {elapsedStr && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--tp-text-muted)",
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                {elapsedStr}
              </span>
            )}
            {/* Fullscreen button - only shown when there's content */}
            {state.output && (
              <button
                onClick={() => setFullscreen(true)}
                title="Expand"
                style={{
                  fontSize: 13,
                  color: "var(--tp-text-muted)",
                  lineHeight: 1,
                  padding: "2px 4px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                ⤢
              </button>
            )}
          </div>
        </div>

        {/* Scrollable body - tool calls + streaming output, capped at 200px */}
        <div
          ref={bodyRef}
          style={{
            maxHeight: 200,
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--tp-border) transparent",
          }}
        >
          <div className="px-3 py-2 space-y-1">
            {state.toolCalls.map((call, i) => (
              <p
                key={i}
                style={{
                  fontSize: 11,
                  color: "var(--tp-text-muted)",
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
        </div>
      </motion.div>

      {/* Fullscreen overlay - rendered into document.body via portal */}
      {fullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-theme="trip-dark"
            className="fixed inset-0 flex items-center justify-center"
            style={{
              zIndex: 9999,
              backgroundColor: "var(--tp-overlay)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => setFullscreen(false)}
          >
            <div
              className="tp-glass flex flex-col"
              style={{
                width: "min(780px, 92vw)",
                height: "82vh",
                backgroundColor: "var(--tp-surface-panel)",
                borderRadius: 12,
                border: `2px solid ${color}`,
                overflow: "hidden",
                boxShadow: "var(--tp-modal-shadow)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div
                className="flex items-center gap-3 px-6 py-4 shrink-0"
                style={{
                  borderBottom: "1px solid var(--tp-border)",
                  backgroundColor: "var(--tp-surface-2)",
                }}
              >
                <StatusDot status={state.status} agent={agent} />
                <AgentBadge agent={agent} />
                {state.toolCalls.length > 0 && (
                  <span style={{ fontSize: 12, color: "var(--tp-text-muted)" }}>
                    {state.toolCalls.length} searches
                  </span>
                )}
                <button
                  onClick={() => setFullscreen(false)}
                  className="ml-auto"
                  style={{
                    fontSize: 18,
                    color: "var(--tp-text-muted)",
                    lineHeight: 1,
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>

              {/* Tool calls */}
              {state.toolCalls.length > 0 && (
                <div
                  className="flex flex-wrap gap-x-4 gap-y-1 px-6 py-2 shrink-0"
                  style={{
                    borderBottom: "1px solid var(--tp-border)",
                    backgroundColor: "var(--tp-surface-2)",
                  }}
                >
                  {state.toolCalls.map((call, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        color: "var(--tp-text-muted)",
                        fontFamily: "var(--font-jetbrains-mono)",
                      }}
                    >
                      &gt; {call}
                    </span>
                  ))}
                </div>
              )}

              {/* Full markdown content */}
              <div
                className="flex-1 overflow-auto px-6 py-5 prose-content"
                style={{ minHeight: 0 }}
              >
                {state.output ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {state.output}
                  </ReactMarkdown>
                ) : (
                  <span style={{ color: "var(--tp-text-muted)", fontStyle: "italic" }}>
                    Waiting for content…
                  </span>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
