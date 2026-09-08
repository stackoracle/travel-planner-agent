from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str


class AuthResponse(BaseModel):
    access_token: str
    user: UserOut


class TripSummary(BaseModel):
    id: str
    job_id: str
    destination: str
    origin: str
    departure_date: str
    return_date: str
    travelers: int
    currency: str
    total_estimated_cost_text: str
    total_estimated_cost_amount: float | None
    created_at: str


class CurrencySpend(BaseModel):
    currency: str
    total: float
    trip_count: int


class StatsResponse(BaseModel):
    total_trips: int
    spend_by_currency: list[CurrencySpend]
