from __future__ import annotations

import asyncio

from loguru import logger

from agents.destination_agent import run_destination_agent
from agents.flight_agent import run_flight_agent
from agents.hotel_agent import run_hotel_agent
from agents.itinerary_agent import run_itinerary_agent
from agents.weather_agent import run_weather_agent
from core.cost_parser import parse_cost_amount
from core.db import create_trip
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
            destination_detail=dest_out,
            flight_detail=flight_out,
            hotel_detail=hotel_out,
            weather_detail=weather_out,
            itinerary_detail=synthesis.summary_text,
            itinerary=synthesis.itinerary,
            total_estimated_cost=synthesis.total_estimated_cost,
            packing_list=synthesis.packing_list,
            map_query=synthesis.map_query,
            stopover=synthesis.stopover,
        )

        job = get_job(job_id)
        if job:
            job.result = result
            if job.user_id:
                await create_trip(
                    user_id=job.user_id,
                    job_id=job_id,
                    destination=request.destination,
                    origin=request.origin,
                    departure_date=request.departure_date,
                    return_date=request.return_date,
                    travelers=request.travelers,
                    currency=request.currency,
                    total_estimated_cost_text=synthesis.total_estimated_cost,
                    total_estimated_cost_amount=parse_cost_amount(
                        synthesis.total_estimated_cost, request.travelers
                    ),
                    result_json=result.model_dump_json(),
                )

    except Exception:
        logger.exception("orchestrator failed")

    finally:
        await queue.put(AgentEvent(agent="system", type="done", data=""))
