"use client"

import { useTripStore } from "@/store/tripStore"

interface Props {
  defaultQuery: string
}

export function MapPanel({ defaultQuery }: Props) {
  const result = useTripStore((s) => s.result)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ""
  const query = encodeURIComponent(result?.map_query ?? defaultQuery)

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: "#E8E2D9" }}>
      {apiKey ? (
        <iframe
          title="Destination map"
          src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}`}
          className="absolute inset-0 w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center" style={{ color: "#A89E94" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🗺️</p>
            <p style={{ fontSize: 13 }}>Map loads with GOOGLE_MAPS_KEY</p>
            <p style={{ fontSize: 12, marginTop: 4, fontFamily: "var(--font-jetbrains-mono)" }}>
              {decodeURIComponent(query)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
