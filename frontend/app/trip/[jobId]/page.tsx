"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useTripStore } from "@/store/tripStore";
import { useAuthStore } from "@/store/authStore";
import { getTrips } from "@/lib/auth";
import type { TripSummary } from "@/lib/auth";
import { AgentStatusPanel } from "@/components/dashboard/AgentStatusPanel";
import { MapPanel } from "@/components/dashboard/MapPanel";
import { LiveFeedPanel } from "@/components/dashboard/LiveFeedPanel";
import { ItineraryPanel } from "@/components/dashboard/ItineraryPanel";
import { AuthNav } from "@/components/shared/AuthNav";

interface Props {
  params: Promise<{ jobId: string }>;
}

export default function TripPage({ params }: Props) {
  const { jobId } = use(params);
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) router.replace("/login");
  }, [hasHydrated, token, router]);

  // Wipe any leftover trip data when this page is for a different job than the
  // store currently holds - otherwise a previously viewed trip's itinerary,
  // map and agent statuses bleed through until (or unless) the new data loads.
  // TripForm sets the store's jobId before navigating here, so a match means
  // we just planned this trip and its `request` is worth keeping.
  useEffect(() => {
    const store = useTripStore.getState();
    if (store.jobId !== jobId) {
      store.reset();
      store.setJobId(jobId);
    }
  }, [jobId]);

  useAgentStream(hasHydrated && token ? jobId : null, token);

  const request = useTripStore((s) => s.request);
  const result = useTripStore((s) => s.result);

  // Opening a trip straight from Trip History skips the planning form, so
  // `request` was never set in this session - fetch its metadata (origin,
  // dates, travelers) from the trips list instead.
  const [historicalTrip, setHistoricalTrip] = useState<TripSummary | null>(null);
  useEffect(() => {
    if (!token || request) return;
    let cancelled = false;
    getTrips(token)
      .then((trips) => {
        if (cancelled) return;
        setHistoricalTrip(trips.find((t) => t.job_id === jobId) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, request, jobId]);

  if (!hasHydrated || !token) {
    return (
      <main
        data-theme="trip-dark"
        style={{ minHeight: "100vh", backgroundColor: "var(--tp-bg)" }}
      />
    );
  }

  const destination =
    result?.destination ??
    request?.destination ??
    historicalTrip?.destination ??
    "Your trip";
  const origin = request?.origin ?? historicalTrip?.origin ?? "";
  const dep = request?.departure_date ?? historicalTrip?.departure_date ?? "";
  const ret = request?.return_date ?? historicalTrip?.return_date ?? "";
  const travelers = request?.travelers ?? historicalTrip?.travelers;

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
      data-theme="trip-dark"
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: "var(--tp-bg)", color: "var(--tp-text)" }}
    >
      {/* Header */}
      <header
        className="tp-glass flex items-center gap-3 px-6 shrink-0"
        style={{
          height: 56,
          borderBottom: "1px solid var(--tp-border)",
          backgroundColor: "var(--tp-surface)",
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#2A6EE8",
            letterSpacing: "0.02em",
            fontFamily: "var(--font-handwriting)",
            display: "inline-block",
            transform: "rotate(-2deg)",
          }}
        >
           TripAssist ✈
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          <InfoPill icon="📍" text={destination} accent />
          {origin && <InfoPill icon="🛫" text={origin} />}
          {dateRange && <InfoPill icon="📅" text={dateRange} />}
          {travelers && (
            <InfoPill
              icon="👥"
              text={`${travelers} traveller${travelers > 1 ? "s" : ""}`}
            />
          )}
        </div>

        <div className="ml-auto">
          <AuthNav showPlanLink={false} />
        </div>

        <Link
          href="/plan"
          className="flex items-center gap-1"
          style={{
            backgroundColor: "var(--tp-accent)",
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

      {/* Agent status - full-width bar above the map */}
      <div className="shrink-0">
        <AgentStatusPanel />
      </div>

      {/* Map fills the rest of the page */}
      <div className="flex-1 overflow-hidden">
        <MapPanel defaultQuery={destination} originQuery={origin} />
      </div>

      {/* Live feed - full-width bar at the bottom of the page */}
      <div className="shrink-0">
        <LiveFeedPanel />
      </div>

      {/* Itinerary pops up in a fullscreen overlay once it's ready */}
      <ItineraryPanel />
    </div>
  );
}

function InfoPill({
  icon,
  text,
  accent,
}: {
  icon: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: accent ? "var(--tp-pill-accent-text)" : "var(--tp-text-secondary)",
        backgroundColor: accent ? "var(--tp-pill-accent-bg)" : "var(--tp-pill-bg)",
        border: `1px solid ${
          accent ? "var(--tp-pill-accent-border)" : "var(--tp-border)"
        }`,
        borderRadius: 999,
        padding: "5px 12px",
        whiteSpace: "nowrap",
      }}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  );
}
