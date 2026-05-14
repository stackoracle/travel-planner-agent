"use client"

import { useEffect, useState } from "react"
import { useTripStore } from "@/store/tripStore"
import type { DayPlan } from "@/lib/api"

interface Coords {
  lat: number
  lon: number
}

interface Props {
  defaultQuery: string
}

function DayDetailOverlay({
  plan,
  onClose,
}: {
  plan: DayPlan
  onClose: () => void
}) {
  const dateStr = new Date(plan.date + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })

  return (
    <div
      className="absolute left-4 top-4 bottom-4 flex flex-col"
      style={{
        width: 264,
        backgroundColor: "rgba(255,255,255,0.96)",
        borderRadius: 10,
        border: "1px solid #E8E2D9",
        boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {/* Overlay header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid #E8E2D9" }}
      >
        <span
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: 15,
            fontWeight: 600,
            color: "#1A1614",
          }}
        >
          Day {plan.day} · {dateStr}
        </span>
        <button
          onClick={onClose}
          style={{
            color: "#A89E94",
            fontSize: 15,
            lineHeight: 1,
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <OverlaySection emoji="☀️" label="Morning" text={plan.morning} />
        <OverlaySection emoji="🌤️" label="Afternoon" text={plan.afternoon} />
        <OverlaySection emoji="🌙" label="Evening" text={plan.evening} />
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2 shrink-0"
        style={{ borderTop: "1px solid #E8E2D9", backgroundColor: "#FAFAF8" }}
      >
        <p style={{ fontSize: 12, color: "#6B6459" }}>{plan.accommodation}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#E8652A" }}>
          {plan.estimated_cost}
        </p>
      </div>
    </div>
  )
}

function OverlaySection({
  emoji,
  label,
  text,
}: {
  emoji: string
  label: string
  text: string
}) {
  return (
    <div>
      <p
        style={{
          fontSize: 10,
          color: "#A89E94",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {emoji} {label}
      </p>
      <p style={{ fontSize: 12, color: "#1A1614", marginTop: 3, lineHeight: 1.65 }}>
        {text}
      </p>
    </div>
  )
}

export function MapPanel({ defaultQuery }: Props) {
  const result = useTripStore((s) => s.result)
  const selectedDay = useTripStore((s) => s.selectedDay)
  const setSelectedDay = useTripStore((s) => s.setSelectedDay)
  const [coords, setCoords] = useState<Coords | null>(null)

  const destination = result?.map_query ?? defaultQuery
  const dayPlan = result?.itinerary.find((d) => d.day === selectedDay) ?? null

  useEffect(() => {
    if (!destination) return
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(destination)}&format=json&limit=1`
    fetch(url, {
      headers: { "User-Agent": "Waypoint-Travel-Planner/1.0" },
    })
      .then((r) => r.json())
      .then((data: Array<{ lat: string; lon: string }>) => {
        if (data[0]) {
          setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) })
        }
      })
      .catch(() => {})
  }, [destination])

  const osmSrc = coords
    ? `https://www.openstreetmap.org/export/embed.html` +
      `?bbox=${coords.lon - 0.15},${coords.lat - 0.15},` +
      `${coords.lon + 0.15},${coords.lat + 0.15}` +
      `&layer=mapnik&marker=${coords.lat},${coords.lon}`
    : null

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: "#E8E2D9" }}>
      {osmSrc ? (
        <iframe
          title="Destination map"
          src={osmSrc}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center" style={{ color: "#A89E94" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🗺️</p>
            <p style={{ fontSize: 13 }}>Locating destination…</p>
            <p
              style={{
                fontSize: 12,
                marginTop: 4,
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            >
              {destination}
            </p>
          </div>
        </div>
      )}

      {dayPlan && (
        <DayDetailOverlay plan={dayPlan} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  )
}
