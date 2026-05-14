from __future__ import annotations

import asyncio
import json
import os
from datetime import date, timedelta

from loguru import logger
from openai import AsyncOpenAI

from schemas.events import AgentEvent, AgentName
from schemas.requests import TripRequest
from schemas.responses import DayPlan

AGENT: AgentName = "itinerary"


class ItinerarySynthesis:
    def __init__(
        self,
        itinerary: list[DayPlan],
        total_estimated_cost: str,
        packing_list: list[str],
        map_query: str,
    ) -> None:
        self.itinerary = itinerary
        self.total_estimated_cost = total_estimated_cost
        self.packing_list = packing_list
        self.map_query = map_query


async def run_itinerary_agent(
    request: TripRequest,
    agent_outputs: tuple[str, str, str, str],
    queue: asyncio.Queue[AgentEvent],
) -> ItinerarySynthesis:
    destination_out, flight_out, hotel_out, weather_out = agent_outputs

    try:
        await queue.put(
            AgentEvent(
                agent=AGENT,
                type="thinking",
                data="Synthesising your personalised itinerary...",
            )
        )

        dep = date.fromisoformat(request.departure_date)
        ret = date.fromisoformat(request.return_date)
        n_days = max((ret - dep).days, 1)

        day2_date = (dep + timedelta(days=1)).isoformat()
        schema_example = (
            f'{{"itinerary": [{{"day": 1, "date": "{request.departure_date}", "morning": "...", '  # noqa: E501
            '"afternoon": "...", "evening": "...", "accommodation": "...", '
            '"estimated_cost": "~€80/person", '
            '"weather": "28°C, partly cloudy", '
            '"locations": ["Place A", "Place B", "Place C"]}, '
            f'{{"day": 2, "date": "{day2_date}", "morning": "...", '
            '"afternoon": "...", "evening": "...", "accommodation": "...", '
            '"estimated_cost": "~€85/person", '
            '"weather": "26°C, sunny", '
            '"locations": ["Place D", "Place E", "Place F"]}], '
            '"total_estimated_cost": "~€1200 per person", '
            '"packing_list": ["item1", "item2"], '
            f'"map_query": "{request.destination}"}}'
        )

        prompt = (
            f"Using this research — destination guide, flight info, accommodation options, "  # noqa: E501
            f"and weather forecast — create a detailed day-by-day itinerary for "
            f"{request.travelers} travellers, {n_days} days in {request.destination}. "
            f"Budget: {request.budget}. Style: {request.travel_style}. "
            f"Day 1 date is {request.departure_date}; increment by one day for each subsequent day. "  # noqa: E501
            f"For each day include morning/afternoon/evening activities, where to stay, "  # noqa: E501
            f"estimated daily cost in {request.currency}, "
            f"a brief 'weather' note (temperature + conditions for that day from the forecast), "  # noqa: E501
            f"and a 'locations' array of exactly 3 specific geocodable place names "
            f"visited that day (one per time slot: morning, afternoon, evening).\n\n"
            f"Respond ONLY with a valid JSON object (no markdown, no code fences) "
            f"exactly matching this structure:\n{schema_example}\n\n"
            f"DESTINATION GUIDE:\n{destination_out}\n\n"
            f"FLIGHT INFO:\n{flight_out}\n\n"
            f"ACCOMMODATION:\n{hotel_out}\n\n"
            f"WEATHER:\n{weather_out}"
        )

        client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
        output = ""
        stream = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                output += token
                await queue.put(AgentEvent(agent=AGENT, type="token", data=token))

        clean = output.strip()
        if clean.startswith("```"):
            lines = clean.splitlines()
            clean = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        data: dict[str, object] = json.loads(clean)

        raw_days = data.get("itinerary", [])
        itinerary = (
            [DayPlan(**d) for d in raw_days if isinstance(d, dict)]
            if isinstance(raw_days, list)
            else []
        )

        total_cost = str(data.get("total_estimated_cost", "N/A"))

        raw_packing = data.get("packing_list", [])
        packing_list = (
            [str(i) for i in raw_packing] if isinstance(raw_packing, list) else []
        )

        map_query = str(data.get("map_query", request.destination))

        await queue.put(AgentEvent(agent=AGENT, type="complete", data=output))
        return ItinerarySynthesis(itinerary, total_cost, packing_list, map_query)

    except Exception:
        logger.exception("itinerary_agent failed")
        await queue.put(
            AgentEvent(agent=AGENT, type="error", data="Itinerary synthesis failed")
        )
        return ItinerarySynthesis([], "N/A", [], request.destination)
