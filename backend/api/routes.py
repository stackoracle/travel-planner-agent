from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from core.job_store import create_job, get_job
from core.orchestrator import run_trip_planning
from schemas.requests import TripRequest
from schemas.responses import TripResult

router = APIRouter()


@router.get("/geocode")
async def geocode(q: str = Query(..., min_length=1)) -> JSONResponse:
    url = "https://nominatim.openstreetmap.org/search"
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get(
            url,
            params={"q": q, "format": "json", "limit": "1"},
            headers={"User-Agent": "Waypoint-Travel-Planner/1.0"},
        )
    r.raise_for_status()
    return JSONResponse(content=r.json())


@router.post("/plan")
async def plan_trip(request: TripRequest) -> dict[str, str]:
    job = create_job()
    asyncio.create_task(run_trip_planning(request, job.job_id, job.queue))
    return {"job_id": job.job_id}


@router.get("/stream/{job_id}")
async def stream_events(job_id: str) -> EventSourceResponse:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def generator() -> AsyncGenerator[dict[str, str], None]:
        while True:
            event = await job.queue.get()
            yield {"data": event.model_dump_json()}
            if event.type == "done":
                break

    return EventSourceResponse(generator())


@router.get("/result/{job_id}")
async def get_result(job_id: str) -> TripResult:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.result is None:
        raise HTTPException(status_code=202, detail="Result not ready yet")
    return job.result
