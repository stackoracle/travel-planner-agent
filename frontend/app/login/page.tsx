"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { login } from "@/lib/auth"
import { useAuthStore } from "@/store/authStore"

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const { access_token, user } = await login(email, password)
      setAuth(access_token, user)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      data-theme="trip-dark"
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "var(--tp-bg)", color: "var(--tp-text)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
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
              marginTop: 12,
            }}
          >
            Welcome to TripAssist!
          </h1>
          <p style={{ fontSize: 14, color: "var(--tp-text-secondary)", marginTop: 6 }}>
            Sign in to enjoy your trip.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              autoComplete="current-password"
            />
          </Field>

          {error && <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-base font-semibold"
            style={{ backgroundColor: "var(--tp-accent)", color: "#fff", border: "none" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p
          style={{
            fontSize: 13,
            color: "var(--tp-text-secondary)",
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--tp-accent-text)", fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </div>
    </main>
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
  padding: "10px 12px",
  outline: "none",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--tp-text-muted)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      {children}
    </div>
  )
}
