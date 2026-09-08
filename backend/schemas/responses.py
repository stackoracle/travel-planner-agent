from __future__ import annotations

from pydantic import BaseModel


class DayPlan(BaseModel):
    day: int
    date: str
    morning: str
    afternoon: str
    evening: str
    accommodation: str
    estimated_cost: str
    weather: str = ""
    locations: list[str] = []


class TripResult(BaseModel):
    job_id: str
    destination: str
    destination_summary: str
    flight_summary: str
    hotel_summary: str
    weather_summary: str
    # Full, untruncated agent bodies - replayed into the live feed when a
    # finished job is reopened (the *_summary fields are capped at 500 chars
    # for list views). Default "" so pre-existing persisted results still load.
    destination_detail: str = ""
    flight_detail: str = ""
    hotel_detail: str = ""
    weather_detail: str = ""
    itinerary_detail: str = ""
    itinerary: list[DayPlan]
    total_estimated_cost: str
    packing_list: list[str]
    map_query: str
    stopover: str = ""
