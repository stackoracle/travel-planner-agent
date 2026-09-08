"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  useEffect(() => {
    if (!hasHydrated) return
    if (!token) router.replace("/login")
  }, [hasHydrated, token, router])

  if (!hasHydrated || !token) {
    return (
      <main
        data-theme="trip-dark"
        style={{ minHeight: "100vh", backgroundColor: "var(--tp-bg)" }}
      />
    )
  }

  return <>{children}</>
}
