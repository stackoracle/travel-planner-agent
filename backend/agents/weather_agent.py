from __future__ import annotations

import asyncio
import json
import os

from loguru import logger
from openai import AsyncOpenAI

from core.tools import run_weather_forecast
from schemas.events import AgentEvent, AgentName
from schemas.requests import TripRequest

AGENT: AgentName = "weather"


async def run_weather_agent(
    request: TripRequest, queue: asyncio.Queue[AgentEvent]
) -> str:
    try:
        await queue.put(
            AgentEvent(
                agent=AGENT,
                type="thinking",
                data=f"Fetching weather forecast for {request.destination}...",
            )
        )

        forecast = await run_weather_forecast(
            request.destination,
            request.departure_date,
            request.return_date,
            AGENT,
            queue,
        )

        forecast_json = json.dumps(forecast, indent=2)

        prompt = (
            f"Given this weather forecast for {request.destination} from "
            f"{request.departure_date} to {request.return_date}:\n{forecast_json}\n\n"
            f"Write a 2-paragraph weather summary and a practical packing list for a "
            f"{request.travel_style} trip."
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

        await queue.put(AgentEvent(agent=AGENT, type="complete", data=output))
        return output

    except Exception:
        logger.exception("weather_agent failed")
        await queue.put(AgentEvent(agent=AGENT, type="error", data="Weather research failed"))
        return ""
