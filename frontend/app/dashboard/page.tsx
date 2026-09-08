"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { getStats, getTrips } from "@/lib/auth"
import type { StatsResponse, TripSummary } from "@/lib/auth"
import { AuthNav } from "@/components/shared/AuthNav"

export default function DashboardPage() {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [trips, setTrips] = useState<TripSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!hasHydrated) return
    if (!token) {
      router.replace("/login")
      return
    }
    let cancelled = false
    Promise.all([getStats(token), getTrips(token)])
      .then(([s, t]) => {
        if (cancelled) return
        setStats(s)
        setTrips(t)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your dashboard. Is the backend running?")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hasHydrated, token, router])

  if (!hasHydrated || !token) {
    return (
      <main
        data-theme="trip-dark"
        style={{ minHeight: "100vh", backgroundColor: "var(--tp-bg)" }}
      />
    )
  }

  return (
    <main
      data-theme="trip-dark"
      className="min-h-screen px-6 py-10"
      style={{ backgroundColor: "var(--tp-bg)", color: "var(--tp-text)" }}
    >
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <Link
              href="/"
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: "#2A6EE8",
                textDecoration: "none",
                fontFamily: "var(--font-handwriting)",
                display: "inline-block",
                transform: "rotate(-2deg)",
              }}
            >
               TripAssist ✈
            </Link>
            <h1
              style={{
                fontFamily: "var(--font-playfair)",
                fontSize: 32,
                fontWeight: 700,
                color: "var(--tp-accent-text)",
                marginTop: 8,
              }}
            >
              Details of My Trips
            </h1>
          </div>
          <AuthNav />
        </header>

        {loading && (
          <p style={{ fontSize: 14, color: "var(--tp-text-secondary)" }}>
            Loading your dashboard…
          </p>
        )}
        {error && <p style={{ fontSize: 14, color: "#ef4444" }}>{error}</p>}

        {!loading && !error && stats && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-10">
              <StatCard label="Trips organized" value={String(stats.total_trips)} />
              <StatCard
                label="Total spent"
                value={
                  stats.spend_by_currency.length === 0
                    ? "—"
                    : stats.spend_by_currency
                        .map((c) => formatCurrency(c.total, c.currency))
                        .join(" · ")
                }
              />
            </div>

            <h2
              style={{
                fontFamily: "var(--font-playfair)",
                fontSize: 20,
                fontWeight: 600,
                color: "var(--tp-accent-text)",
                marginBottom: 16,
              }}
            >
              Trip history
            </h2>

            {trips.length === 0 ? (
              <div
                className="text-center py-16"
                style={{
                  backgroundColor: "var(--tp-muted)",
                  border: "1px solid var(--tp-border)",
                  borderRadius: 8,
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--tp-text-secondary)",
                    marginBottom: 16,
                  }}
                >
                  You haven&apos;t planned a trip yet.
                </p>
                <Link
                  href="/plan"
                  style={{
                    display: "inline-block",
                    backgroundColor: "var(--tp-accent)",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "8px 18px",
                    borderRadius: 6,
                    textDecoration: "none",
                  }}
                >
                  ✈ Plan your first trip
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <TripRow key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        backgroundColor: "var(--tp-surface)",
        border: "1px solid var(--tp-border)",
        borderRadius: 8,
        padding: "20px 24px",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--tp-text-muted)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-playfair)",
          fontSize: 28,
          fontWeight: 700,
          color: "var(--tp-accent-text)",
        }}
      >
        {value}
      </p>
    </div>
  )
}

function TripRow({ trip }: { trip: TripSummary }) {
  const dateRange = `${formatDate(trip.departure_date)} – ${formatDate(trip.return_date)}`
  const cost =
    trip.total_estimated_cost_amount !== null
      ? formatCurrency(trip.total_estimated_cost_amount, trip.currency)
      : trip.total_estimated_cost_text

  return (
    <Link
      href={`/trip/${trip.job_id}`}
      className="flex items-center justify-between"
      style={{
        backgroundColor: "var(--tp-surface)",
        border: "1px solid var(--tp-border)",
        borderRadius: 8,
        padding: "14px 20px",
        textDecoration: "none",
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "var(--font-playfair)",
            fontSize: 17,
            color: "var(--tp-text)",
          }}
        >
          {trip.destination}
        </p>
        <p style={{ fontSize: 12, color: "var(--tp-text-secondary)", marginTop: 2 }}>
          from {trip.origin} · {dateRange} · {trip.travelers} traveller
          {trip.travelers > 1 ? "s" : ""}
        </p>
      </div>
      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--tp-accent-text)",
          whiteSpace: "nowrap",
        }}
      >
        {cost}
      </p>
    </Link>
  )
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount.toFixed(0)} ${currency}`
  }
}
