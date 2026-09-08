const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"

export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  access_token: string
  user: AuthUser
}

export interface TripSummary {
  id: string
  job_id: string
  destination: string
  origin: string
  departure_date: string
  return_date: string
  travelers: number
  currency: string
  total_estimated_cost_text: string
  total_estimated_cost_amount: number | null
  created_at: string
}

export interface CurrencySpend {
  currency: string
  total: number
  trip_count: number
}

export interface StatsResponse {
  total_trips: number
  spend_by_currency: CurrencySpend[]
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string }
    return data.detail ?? fallback
  } catch {
    return fallback
  }
}

export const signup = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Could not create your account."))
  }
  return res.json() as Promise<AuthResponse>
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Invalid email or password."))
  }
  return res.json() as Promise<AuthResponse>
}

export const getTrips = async (token: string): Promise<TripSummary[]> => {
  const res = await fetch(`${API_BASE}/trips`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to load trips")
  return res.json() as Promise<TripSummary[]>
}

export const getStats = async (token: string): Promise<StatsResponse> => {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to load stats")
  return res.json() as Promise<StatsResponse>
}
