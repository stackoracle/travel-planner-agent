"use client"

import { useEffect, useRef, useState } from "react"
import { WORLD_CITIES } from "@/lib/cities"

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
}

export function CityAutocomplete({ value, onChange, placeholder, style }: Props) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const query = value.trim().toLowerCase()
  const matches = (
    query ? WORLD_CITIES.filter((c) => c.toLowerCase().includes(query)) : WORLD_CITIES
  ).slice(0, 358)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectCity = (city: string) => {
    onChange(city)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setHighlight((h) => Math.min(h + 1, matches.length - 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
          } else if (e.key === "Enter") {
            e.preventDefault()
            selectCity(matches[highlight])
          } else if (e.key === "Escape") {
            setOpen(false)
          }
        }}
        style={style}
      />
      {open && matches.length > 0 && (
        <div
          className="tp-glass"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "var(--tp-surface-panel)",
            border: "1px solid var(--tp-border)",
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            maxHeight: 360,
            overflowY: "auto",
            zIndex: 20,
          }}
        >
          {matches.map((city, i) => (
            <button
              key={city}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => selectCity(city)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: 13,
                fontFamily: "var(--font-dm-sans)",
                color: "var(--tp-text)",
                backgroundColor:
                  i === highlight ? "var(--tp-accent-tint)" : "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
