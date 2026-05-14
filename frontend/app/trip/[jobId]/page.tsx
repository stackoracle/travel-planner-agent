"use client";

import { use } from "react";
import Link from "next/link";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useTripStore } from "@/store/tripStore";
import { AgentStatusPanel } from "@/components/dashboard/AgentStatusPanel";
import { MapPanel } from "@/components/dashboard/MapPanel";
import { LiveFeedPanel } from "@/components/dashboard/LiveFeedPanel";
import { ItineraryPanel } from "@/components/dashboard/ItineraryPanel";

interface Props {
  params: Promise<{ jobId: string }>;
}

export default function TripPage({ params }: Props) {
  const { jobId } = use(params);
  useAgentStream(jobId);

  const request = useTripStore((s) => s.request);
  const result = useTripStore((s) => s.result);

  const destination =
    result?.destination ?? request?.destination ?? "Your trip";
  const origin = request?.origin ?? "";
  const dep = request?.departure_date ?? "";
  const ret = request?.return_date ?? "";

  const depStr = dep
    ? new Date(dep + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const retStr = ret
    ? new Date(ret + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "";
  const dateRange = depStr && retStr ? `${depStr} – ${retStr}` : depStr;

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: "#FAFAF8" }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-3 px-6 shrink-0"
        style={{
          height: 56,
          borderBottom: "1px solid #E8E2D9",
          backgroundColor: "#FFFFFF",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#E8652A",
            letterSpacing: "0.1em",
          }}
        >
          ✈ WAYPOINT
        </span>
        <span style={{ color: "#E8E2D9" }}>·</span>
        <span
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: 16,
            fontWeight: 600,
            color: "#1A1614",
          }}
        >
          {destination}
        </span>
        {origin && (
          <>
            <span style={{ color: "#E8E2D9" }}>·</span>
            <span style={{ fontSize: 13, color: "#6B6459" }}>
              from {origin}
            </span>
          </>
        )}
        {dateRange && (
          <>
            <span style={{ color: "#E8E2D9" }}>·</span>
            <span style={{ fontSize: 13, color: "#6B6459" }}>{dateRange}</span>
          </>
        )}
        {request?.travelers && (
          <>
            <span style={{ color: "#E8E2D9" }}>·</span>
            <span style={{ fontSize: 13, color: "#6B6459" }}>
              {request.travelers} traveller{request.travelers > 1 ? "s" : ""}
            </span>
          </>
        )}

        <Link
          href="/"
          className="ml-auto flex items-center gap-1"
          style={{
            backgroundColor: "#E8652A",
            color: "#FFFFFF",
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: 6,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          ← New Trip
        </Link>
      </header>

      {/* Three-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left - Agent status (240px) */}
        <div className="h-full" style={{ width: 240, flexShrink: 0 }}>
          <AgentStatusPanel />
        </div>

        {/* Center - Map (flex-1) */}
        <div className="flex-1 overflow-hidden">
          <MapPanel defaultQuery={destination} />
        </div>

        {/* Right - Live feed (320px) */}
        <div
          className="h-full overflow-hidden"
          style={{ width: 320, flexShrink: 0 }}
        >
          <LiveFeedPanel />
        </div>
      </div>

      {/* Bottom - Itinerary reveal */}
      <ItineraryPanel />
    </div>
  );
}
