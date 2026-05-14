from __future__ import annotations

import asyncio

from loguru import logger

from agents.destination_agent import run_destination_agent
from agents.flight_agent import run_flight_agent
from agents.hotel_agent import run_hotel_agent
from agents.itinerary_agent import run_itinerary_agent
from agents.weather_agent import run_weather_agent
from core.job_store import get_job
from schemas.events import AgentEvent
from schemas.requests import TripRequest
from schemas.responses import TripResult


async def run_trip_planning(
    request: TripRequest,
    job_id: str,
    queue: asyncio.Queue[AgentEvent],
) -> None:
    try:
        raw = await asyncio.gather(
            run_destination_agent(request, queue),
            run_flight_agent(request, queue),
            run_hotel_agent(request, queue),
            run_weather_agent(request, queue),
            return_exceptions=True,
        )

        def safe(r: object) -> str:
            return r if isinstance(r, str) else ""

        dest_out = safe(raw[0])
        flight_out = safe(raw[1])
        hotel_out = safe(raw[2])
        weather_out = safe(raw[3])

        synthesis = await run_itinerary_agent(
            request, (dest_out, flight_out, hotel_out, weather_out), queue
        )

        result = TripResult(
            job_id=job_id,
            destination=request.destination,
            destination_summary=dest_out[:500] or "N/A",
            flight_summary=flight_out[:500] or "N/A",
            hotel_summary=hotel_out[:500] or "N/A",
            weather_summary=weather_out[:500] or "N/A",
            itinerary=synthesis.itinerary,
            total_estimated_cost=synthesis.total_estimated_cost,
            packing_list=synthesis.packing_list,
            map_query=synthesis.map_query,
        )

        job = get_job(job_id)
        if job:
            job.result = result

    except Exception:
        logger.exception("orchestrator failed")

    finally:
        await queue.put(AgentEvent(agent="system", type="done", data=""))
