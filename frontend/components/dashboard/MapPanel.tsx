"use client"

import { useEffect, useState } from "react"

import { useTripStore } from "@/store/tripStore"

interface Coords {
  lat: number
  lon: number
}

interface Props {
  defaultQuery: string
}

export function MapPanel({ defaultQuery }: Props) {
  const result = useTripStore((s) => s.result)
  const [coords, setCoords] = useState<Coords | null>(null)

  const destination = result?.map_query ?? defaultQuery

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
    </div>
  )
}
