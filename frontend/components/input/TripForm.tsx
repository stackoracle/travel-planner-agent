"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { startTrip } from "@/lib/api"
import { useTripStore } from "@/store/tripStore"
import type { TripRequest } from "@/lib/api"

const BUDGETS = ["budget", "mid-range", "luxury"]
const STYLES = ["adventure", "cultural", "relaxation", "foodie"]
const CURRENCIES = ["EUR", "USD", "GBP", "JPY", "AUD", "CAD"]

export function TripForm() {
  const router = useRouter()
  const { setRequest, setJobId, reset } = useTripStore()

  const [form, setForm] = useState<TripRequest>({
    destination: "",
    origin: "",
    departure_date: "",
    return_date: "",
    budget: "mid-range",
    travel_style: "cultural",
    travelers: 2,
    currency: "EUR",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const set = (k: keyof TripRequest, v: TripRequest[keyof TripRequest]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.destination || !form.origin || !form.departure_date || !form.return_date) {
      setError("Please fill in all required fields.")
      return
    }
    setError("")
    setLoading(true)
    try {
      reset()
      const { job_id } = await startTrip(form)
      setRequest(form)
      setJobId(job_id)
      router.push(`/trip/${job_id}`)
    } catch {
      setError("Could not connect to the planning server. Is the backend running?")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
      {/* Destination */}
      <div>
        <input
          type="text"
          placeholder="Tokyo, Japan"
          value={form.destination}
          onChange={(e) => set("destination", e.target.value)}
          style={{
            width: "100%",
            fontSize: 24,
            fontFamily: "var(--font-playfair)",
            color: "#1A1614",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: "2px solid #E8E2D9",
            outline: "none",
            padding: "8px 0",
          }}
          onFocus={(e) => (e.target.style.borderBottomColor = "#E8652A")}
          onBlur={(e) => (e.target.style.borderBottomColor = "#E8E2D9")}
        />
      </div>

      {/* Origin + Dates */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="From">
          <input
            type="text"
            placeholder="Amsterdam"
            value={form.origin}
            onChange={(e) => set("origin", e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Departure">
          <input
            type="date"
            value={form.departure_date}
            onChange={(e) => set("departure_date", e.target.value)}
            style={inputStyle}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Return">
          <input
            type="date"
            value={form.return_date}
            onChange={(e) => set("return_date", e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Travelers">
          <select
            value={form.travelers}
            onChange={(e) => set("travelers", Number(e.target.value))}
            style={inputStyle}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "person" : "people"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Currency */}
      <Field label="Currency">
        <div className="flex gap-2 flex-wrap">
          {CURRENCIES.map((c) => (
            <TileButton
              key={c}
              label={c}
              selected={form.currency === c}
              onClick={() => set("currency", c)}
              small
            />
          ))}
        </div>
      </Field>

      {/* Budget */}
      <Field label="Budget">
        <div className="flex gap-3">
          {BUDGETS.map((b) => (
            <TileButton
              key={b}
              label={b.charAt(0).toUpperCase() + b.slice(1)}
              selected={form.budget === b}
              onClick={() => set("budget", b)}
            />
          ))}
        </div>
      </Field>

      {/* Travel style */}
      <Field label="Travel style">
        <div className="flex gap-3 flex-wrap">
          {STYLES.map((s) => (
            <TileButton
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              selected={form.travel_style === s}
              onClick={() => set("travel_style", s)}
            />
          ))}
        </div>
      </Field>

      {error && (
        <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 text-base font-semibold"
        style={{ backgroundColor: "#E8652A", color: "#fff", border: "none" }}
      >
        {loading ? "Starting…" : "✈  Plan my trip"}
      </Button>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 14,
  fontFamily: "var(--font-dm-sans)",
  color: "#1A1614",
  backgroundColor: "#F4F1EC",
  border: "1px solid #E8E2D9",
  borderRadius: 6,
  padding: "8px 12px",
  outline: "none",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p style={{ fontSize: 11, fontWeight: 600, color: "#A89E94", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function TileButton({
  label,
  selected,
  onClick,
  small,
}: {
  label: string
  selected: boolean
  onClick: () => void
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: small ? "4px 10px" : "8px 16px",
        borderRadius: 6,
        fontSize: small ? 12 : 13,
        fontWeight: selected ? 600 : 400,
        fontFamily: "var(--font-dm-sans)",
        border: selected ? "1.5px solid #E8652A" : "1.5px solid #E8E2D9",
        backgroundColor: selected ? "#FDF0EA" : "#F4F1EC",
        color: selected ? "#E8652A" : "#6B6459",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  )
}
