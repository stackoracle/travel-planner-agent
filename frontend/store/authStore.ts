"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface AuthUser {
  id: string
  name: string
  email: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  hasHydrated: boolean
  setAuth: (token: string, user: AuthUser) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "TripAssist-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
