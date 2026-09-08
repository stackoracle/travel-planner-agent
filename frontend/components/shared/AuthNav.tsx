"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

export function AuthNav({ showPlanLink = true }: { showPlanLink?: boolean }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const linkStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--tp-text-secondary)",
    textDecoration: "none",
    fontFamily: "var(--font-dm-sans)",
  }

  const accentLinkStyle: React.CSSProperties = {
    ...linkStyle,
    color: "var(--tp-accent-text)",
  }

  if (!user) {
    return (
      <nav className="flex items-center gap-4">
        <Link href="/login" style={linkStyle}>
          Sign in
        </Link>
        <Link href="/signup" style={accentLinkStyle}>
          Sign up
        </Link>
      </nav>
    )
  }

  return (
    <nav className="flex items-center gap-4">
      {showPlanLink && (
        <Link href="/plan" style={linkStyle}>
          Plan a trip
        </Link>
      )}
      <Link href="/dashboard" style={linkStyle}>
        Dashboard
      </Link>
      <span style={{ fontSize: 13, color: "var(--tp-text-muted)" }}>
        {user.name}
      </span>
      <button
        type="button"
        onClick={() => {
          logout()
          router.push("/login")
        }}
        style={{ ...linkStyle, background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        Log out
      </button>
    </nav>
  )
}
