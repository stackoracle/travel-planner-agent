"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { startTrip } from "@/lib/api"
import { useTripStore } from "@/store/tripStore"
import { useAuthStore } from "@/store/authStore"
import { CityAutocomplete } from "@/components/input/CityAutocomplete"
import type { TripRequest } from "@/lib/api"
import { AlignCenter } from "lucide-react"

const BUDGETS = [
  {
    id: "shoestring",
    label: "Shoestring",
    description: "Dorms, self-catering",
  },
  {
    id: "budget",
    label: "Budget",
    description: "Hostels, street food",
  },
  {
    id: "mid-range",
    label: "Mid-range",
    description: "3-star hotels",
  },
  {
    id: "premium",
    label: "Premium",
    description: "4-star hotels",
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "5-star, fine dining",
  },
]
const STYLES = [
  {
    id: "adventure",
    label: "Adventure",
    description: "Hiking, sports, outdoor thrills",
  },
  {
    id: "cultural",
    label: "Cultural",
    description: "Museums, history, local traditions",
  },
  {
    id: "relaxation",
    label: "Relaxation",
    description: "Beaches, spas, slow days",
  },
  {
    id: "foodie",
    label: "Foodie",
    description: "Markets, tastings, local cuisine",
  },
  {
    id: "nightlife",
    label: "Nightlife",
    description: "Bars, clubs, live music",
  },
  {
    id: "family",
    label: "Family",
    description: "Kid-friendly sights, easy pace",
  },
  {
    id: "romantic",
    label: "Romantic",
    description: "Sunsets, fine dining, quiet spots",
  },
  {
    id: "wellness",
    label: "Wellness",
    description: "Yoga, retreats, mindful travel",
  },
]
const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
  { code: "EUR", symbol: "€" },
  { code: "JPY", symbol: "¥" },
]
const PAYMENT_METHODS = [
  { id: "credit-card", label: "Credit card" },
  { id: "paypal", label: "PayPal" },
  { id: "debit-card", label: "Debit card" },
  { id: "cash", label: "Cash" },
]

export function TripForm() {
  const router = useRouter()
  const { setRequest, setJobId, reset } = useTripStore()
  const token = useAuthStore((s) => s.token)

  const [form, setForm] = useState<TripRequest>({
    destination: "",
    origin: "",
    departure_date: "",
    return_date: "",
    budget: "mid-range",
    travel_style: "cultural",
    travelers: 2,
    currency: "EUR",
    payment_method: "credit-card",
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
      const { job_id } = await startTrip(form, token)
      setRequest(form)
      setJobId(job_id)
      router.push(`/trip/${job_id}`)
    } catch {
      setError("Could not connect to the planning server. Is the backend running?")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-3">
      {/* Destination */}
      <div>
        <div>
          <span style={{ textAlign: "center", fontSize: 22 , fontFamily: "Times New Roman"}}>Details of My Trip</span>
        </div>
        
        <input
          type="text"
          placeholder="Destination(e.g. Tokyo, Japan)"
          value={form.destination}
          onChange={(e) => set("destination", e.target.value)}
          style={{
            width: "100%",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-dm-sans)",
            color: "var(--tp-text)",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: "2px solid var(--tp-border)",
            outline: "none",
            padding: "8px 0",
          }}
          onFocus={(e) => (e.target.style.borderBottomColor = "var(--tp-accent)")}
          onBlur={(e) => (e.target.style.borderBottomColor = "var(--tp-border)")}
        />
      </div>

      {/* Origin + Travelers */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="My Current Location">
          <CityAutocomplete
            value={form.origin}
            onChange={(v) => set("origin", v)}
            placeholder="e.g. Amsterdam, Netherlands"
            style={inputStyle}
          />
        </Field>
        <Field label="Travelers">
          <input
            type="number"
            min={1}
            value={form.travelers}
            onChange={(e) => set("travelers", Number(e.target.value))}
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Departure">
          <input
            type="date"
            value={form.departure_date}
            onChange={(e) => set("departure_date", e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Return">
          <input
            type="date"
            value={form.return_date}
            onChange={(e) => set("return_date", e.target.value)}
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Aim for travel */}
      <Field label="Aim for travel">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {STYLES.map((s) => (
            <DescriptiveTile
              key={s.id}
              label={s.label}
              description={s.description}
              selected={form.travel_style === s.id}
              onClick={() => set("travel_style", s.id)}
            />
          ))}
        </div>
      </Field>

      {/* Budget */}
      <Field label="Expenditure">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {BUDGETS.map((b) => (
            <DescriptiveTile
              key={b.id}
              label={b.label}
              description={b.description}
              selected={form.budget === b.id}
              onClick={() => set("budget", b.id)}
            />
          ))}
        </div>
      </Field>

      {/* Currency */}
      <Field label="Currency">
        <div className="flex gap-2 flex-wrap">
          {CURRENCIES.map((c) => (
            <TileButton
              key={c.code}
              label={c.symbol}
              selected={form.currency === c.code}
              onClick={() => set("currency", c.code)}
              small
            />
          ))}
        </div>
      </Field>

      {/* Payment method */}
      <Field label="Payment method">
        <div className="flex gap-2 flex-nowrap">
          {PAYMENT_METHODS.map((m) => (
            <TileButton
              key={m.id}
              label={m.label}
              selected={form.payment_method === m.id}
              onClick={() => set("payment_method", m.id)}
              small
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
        style={{ backgroundColor: "var(--tp-accent)", color: "#fff", border: "none" }}
      >
        {loading ? "Starting…" : "Make a plan for my trip"}
      </Button>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 14,
  fontFamily: "var(--font-dm-sans)",
  color: "var(--tp-text)",
  backgroundColor: "var(--tp-muted)",
  border: "1px solid var(--tp-border)",
  borderRadius: 6,
  padding: "8px 12px",
  outline: "none",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--tp-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function DescriptiveTile({
  label,
  description,
  selected,
  onClick,
}: {
  label: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left"
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        border: selected
          ? "1.5px solid var(--tp-accent)"
          : "1.5px solid var(--tp-border)",
        backgroundColor: selected ? "var(--tp-accent-tint)" : "var(--tp-muted)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "var(--font-dm-sans)",
          color: selected ? "var(--tp-accent-text)" : "var(--tp-text)",
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 11,
          lineHeight: 1.25,
          fontFamily: "var(--font-dm-sans)",
          color: selected ? "var(--tp-accent-text)" : "var(--tp-text-secondary)",
        }}
      >
        {description}
      </p>
    </button>
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
        border: selected
          ? "1.5px solid var(--tp-accent)"
          : "1.5px solid var(--tp-border)",
        backgroundColor: selected ? "var(--tp-accent-tint)" : "var(--tp-muted)",
        color: selected ? "var(--tp-accent-text)" : "var(--tp-text-secondary)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  )
}
