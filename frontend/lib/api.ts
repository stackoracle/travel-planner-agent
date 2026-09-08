const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"

export interface TripRequest {
  destination: string
  origin: string
  departure_date: string
  return_date: string
  budget: string
  travel_style: string
  travelers: number
  currency: string
  payment_method: string
}

export interface DayPlan {
  day: number
  date: string
  morning: string
  afternoon: string
  evening: string
  accommodation: string
  estimated_cost: string
  weather?: string
  locations?: string[]
}

export interface TripResult {
  job_id: string
  destination: string
  destination_summary: string
  flight_summary: string
  hotel_summary: string
  weather_summary: string
  itinerary: DayPlan[]
  total_estimated_cost: string
  packing_list: string[]
  map_query: string
  stopover?: string
}

export const startTrip = async (
  payload: TripRequest,
  token?: string | null
): Promise<{ job_id: string }> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/plan`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to start trip planning")
  return res.json() as Promise<{ job_id: string }>
}

export const getResult = async (
  jobId: string,
  token?: string | null
): Promise<TripResult> => {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/result/${jobId}`, { headers })
  if (!res.ok) throw new Error("Failed to fetch result")
  return res.json() as Promise<TripResult>
}
