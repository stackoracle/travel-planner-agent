from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from core.auth import (
    create_access_token,
    get_current_user_id,
    hash_password,
    resolve_user_id,
    verify_password,
)
from core.db import (
    create_user,
    get_stats,
    get_trip_by_job_id,
    get_user_by_email,
    get_user_by_id,
    list_trips,
)
from core.job_store import create_job, get_job
from core.orchestrator import run_trip_planning
from schemas.auth import (
    AuthResponse,
    LoginRequest,
    SignupRequest,
    StatsResponse,
    TripSummary,
    UserOut,
)
from schemas.events import AgentEvent, AgentName
from schemas.requests import TripRequest
from schemas.responses import TripResult


def _synthetic_events(result: TripResult) -> list[AgentEvent]:
    # Replays a finished trip as a completed snapshot - used when the job's
    # original in-memory event queue is gone (already drained by the first
    # viewer, or the backend restarted since the job store is not durable).
    # Replay each agent's full body. The frontend renders an agent's body from
    # "token" events and treats the "complete" payload as the authoritative
    # full text, so send both. Fall back to the capped *_summary fields for
    # results persisted before *_detail existed.
    bodies: list[tuple[AgentName, str]] = [
        ("destination", result.destination_detail or result.destination_summary),
        ("flight", result.flight_detail or result.flight_summary),
        ("hotel", result.hotel_detail or result.hotel_summary),
        ("weather", result.weather_detail or result.weather_summary),
        ("itinerary", result.itinerary_detail or result.total_estimated_cost),
    ]
    events: list[AgentEvent] = []
    for agent, body in bodies:
        events.append(AgentEvent(agent=agent, type="token", data=body))
        events.append(AgentEvent(agent=agent, type="complete", data=body))
    events.append(AgentEvent(agent="system", type="done", data=""))
    return events


async def _load_trip_result(job_id: str, user_id: str) -> TripResult | None:
    job = get_job(job_id)
    if job and job.user_id == user_id and job.result is not None:
        return job.result

    row = await get_trip_by_job_id(user_id, job_id)
    if row and row.get("result_json"):
        return TripResult.model_validate_json(row["result_json"])
    return None


router = APIRouter()


@router.post("/auth/signup", status_code=201)
async def signup(request: SignupRequest) -> AuthResponse:
    email = request.email.lower()
    if await get_user_by_email(email):
        raise HTTPException(status_code=409, detail="Email is already registered")

    user = await create_user(email, request.name, hash_password(request.password))
    token = create_access_token(user["id"])
    return AuthResponse(
        access_token=token,
        user=UserOut(id=user["id"], name=user["name"], email=user["email"]),
    )


@router.post("/auth/login")
async def login(request: LoginRequest) -> AuthResponse:
    user = await get_user_by_email(request.email.lower())
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user["id"])
    return AuthResponse(
        access_token=token,
        user=UserOut(id=user["id"], name=user["name"], email=user["email"]),
    )


@router.get("/auth/me")
async def me(user_id: str = Depends(get_current_user_id)) -> UserOut:
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(id=user["id"], name=user["name"], email=user["email"])


@router.get("/trips")
async def trips(user_id: str = Depends(get_current_user_id)) -> list[TripSummary]:
    rows = await list_trips(user_id)
    return [TripSummary(**row) for row in rows]


@router.get("/stats")
async def stats(user_id: str = Depends(get_current_user_id)) -> StatsResponse:
    data = await get_stats(user_id)
    return StatsResponse(**data)


@router.get("/geocode")
async def geocode(
    q: str = Query(..., min_length=1),
    user_id: str = Depends(get_current_user_id),
) -> JSONResponse:
    url = "https://photon.komoot.io/api/"
    # Photon 403s requests carrying httpx's default User-Agent (it filters
    # out generic HTTP-library signatures) - identify the app instead.
    headers = {"User-Agent": "TripAssist/1.0 (travel planner app)"}
    try:
        async with httpx.AsyncClient(timeout=8, headers=headers) as client:
            r = await client.get(url, params={"q": q, "limit": "1"})
        r.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail="Geocoding service unavailable"
        ) from exc

    features = r.json().get("features", [])
    results = [
        {"lat": str(lat), "lon": str(lon)}
        for lon, lat in (f["geometry"]["coordinates"] for f in features)
    ]
    return JSONResponse(content=results)


@router.post("/plan")
async def plan_trip(
    request: TripRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, str]:
    job = create_job(user_id)
    asyncio.create_task(run_trip_planning(request, job.job_id, job.queue))
    return {"job_id": job.job_id}


@router.get("/stream/{job_id}")
async def stream_events(
    job_id: str, token: str | None = Query(default=None)
) -> EventSourceResponse:
    # EventSource can't set an Authorization header, so the token travels
    # as a query param here instead.
    user_id = await resolve_user_id(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    job = get_job(job_id)
    if job and job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this job")

    # A still-running job streams live from its queue. Anything else - the
    # job already finished and its queue was drained by the first viewer, or
    # the backend restarted since the in-memory job store isn't durable -
    # gets replayed as a completed snapshot instead of hanging forever on an
    # empty queue that nothing will ever fill again.
    if job and job.result is None:

        async def generator() -> AsyncGenerator[dict[str, str], None]:
            while True:
                event = await job.queue.get()
                yield {"data": event.model_dump_json()}
                if event.type == "done":
                    break

        return EventSourceResponse(generator())

    result = await _load_trip_result(job_id, user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found")

    async def snapshot_generator() -> AsyncGenerator[dict[str, str], None]:
        for event in _synthetic_events(result):
            yield {"data": event.model_dump_json()}

    return EventSourceResponse(snapshot_generator())


@router.get("/result/{job_id}")
async def get_result(
    job_id: str, user_id: str = Depends(get_current_user_id)
) -> TripResult:
    job = get_job(job_id)
    if job and job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized for this job")
    if job and job.result is None:
        raise HTTPException(status_code=202, detail="Result not ready yet")

    result = await _load_trip_result(job_id, user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return result
