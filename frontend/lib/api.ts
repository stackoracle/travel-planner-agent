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
}

export const startTrip = async (
  payload: TripRequest
): Promise<{ job_id: string }> => {
  const res = await fetch(`${API_BASE}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error("Failed to start trip planning")
  return res.json() as Promise<{ job_id: string }>
}

export const getResult = async (jobId: string): Promise<TripResult> => {
  const res = await fetch(`${API_BASE}/result/${jobId}`)
  if (!res.ok) throw new Error("Failed to fetch result")
  return res.json() as Promise<TripResult>
}
