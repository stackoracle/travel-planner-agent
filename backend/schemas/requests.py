from __future__ import annotations

from pydantic import BaseModel


class TripRequest(BaseModel):
    destination: str
    origin: str
    departure_date: str
    return_date: str
    budget: str
    travel_style: str
    travelers: int = 2
    currency: str = "EUR"
