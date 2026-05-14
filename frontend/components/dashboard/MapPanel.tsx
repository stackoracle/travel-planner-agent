"use client"

import { useEffect, useRef, useState } from "react"
import { useTripStore } from "@/store/tripStore"

type L = typeof import("leaflet")

interface Props {
  defaultQuery: string
}

export function MapPanel({ defaultQuery }: Props) {
  const result = useTripStore((s) => s.result)
  const selectedDay = useTripStore((s) => s.selectedDay)

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("leaflet").Map | null>(null)
  const markersRef = useRef<import("leaflet").Marker[]>([])
  const polylineRef = useRef<import("leaflet").Polyline | null>(null)
  const destMarkerRef = useRef<import("leaflet").Marker | null>(null)
  const [leaflet, setLeaflet] = useState<L | null>(null)

  const destination = result?.map_query ?? defaultQuery

  // Load Leaflet once (browser only)
  useEffect(() => {
    import("leaflet").then(setLeaflet)
  }, [])

  // Initialise map when Leaflet is ready
  useEffect(() => {
    if (!leaflet || !containerRef.current || mapRef.current) return

    const map = leaflet.map(containerRef.current, {
      center: [35.68, 139.69],
      zoom: 11,
      zoomControl: true,
    })

    leaflet
      .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      })
      .addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [leaflet])

  // Geocode destination → center map + pin
  useEffect(() => {
    if (!leaflet || !mapRef.current || !destination) return
    const controller = new AbortController()

    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "Waypoint-Travel-Planner/1.0" },
      }
    )
      .then((r) => r.json())
      .then((data: Array<{ lat: string; lon: string }>) => {
        if (!data[0] || !mapRef.current || !leaflet) return
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)

        destMarkerRef.current?.remove()
        const icon = leaflet.divIcon({
          html: `<div style="background:#E8652A;color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35)">📍</div>`,
          className: "",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        })
        destMarkerRef.current = leaflet
          .marker([lat, lon], { icon })
          .bindPopup(`<strong>${destination}</strong>`)
          .addTo(mapRef.current!)

        if (!selectedDay) {
          mapRef.current!.setView([lat, lon], 12)
        }
      })
      .catch(() => {})

    return () => controller.abort()
    // selectedDay intentionally omitted — handled via ref guard above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaflet, destination])

  // Show numbered markers + route when a day is selected
  useEffect(() => {
    if (!leaflet || !mapRef.current) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    polylineRef.current?.remove()
    polylineRef.current = null

    const dayPlan = result?.itinerary.find((d) => d.day === selectedDay)
    if (!dayPlan?.locations?.length) {
      if (destMarkerRef.current && mapRef.current) {
        const pos = destMarkerRef.current.getLatLng()
        mapRef.current.setView(pos, 12)
      }
      return
    }

    const labels = ["☀️", "🌤️", "🌙"]
    const colors = ["#E8652A", "#2A6EE8", "#8B3A8B"]

    Promise.all(
      dayPlan.locations.map((loc, i) =>
        fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(loc + ", " + destination)}&format=json&limit=1`,
          { headers: { "User-Agent": "Waypoint-Travel-Planner/1.0" } }
        )
          .then((r) => r.json())
          .then((data: Array<{ lat: string; lon: string }>) =>
            data[0]
              ? {
                  lat: parseFloat(data[0].lat),
                  lon: parseFloat(data[0].lon),
                  emoji: labels[i] ?? String(i + 1),
                  color: colors[i] ?? "#E8652A",
                  label: loc,
                  index: i + 1,
                }
              : null
          )
          .catch(() => null)
      )
    ).then((results) => {
      if (!mapRef.current || !leaflet) return
      const valid = results.filter(Boolean) as {
        lat: number
        lon: number
        emoji: string
        color: string
        label: string
        index: number
      }[]
      if (!valid.length) return

      const coords: [number, number][] = []

      valid.forEach(({ lat, lon, emoji, color, label, index }) => {
        const icon = leaflet.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;border:2.5px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35)">${emoji}</div>`,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        })

        const marker = leaflet
          .marker([lat, lon], { icon })
          .bindPopup(`<strong>${index}. ${label}</strong>`)
          .addTo(mapRef.current!)

        markersRef.current.push(marker)
        coords.push([lat, lon])
      })

      if (coords.length > 1) {
        polylineRef.current = leaflet
          .polyline(coords, {
            color: "#E8652A",
            weight: 2.5,
            opacity: 0.72,
            dashArray: "9, 7",
          })
          .addTo(mapRef.current!)
      }

      mapRef.current!.fitBounds(leaflet.latLngBounds(coords), {
        padding: [50, 50],
      })
    })
  }, [leaflet, selectedDay, result, destination])

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: "#E8E2D9" }}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {!leaflet && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center" style={{ color: "#A89E94" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🗺️</p>
            <p style={{ fontSize: 13 }}>Loading map…</p>
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
