from __future__ import annotations

import asyncio
import os

from loguru import logger
from openai import AsyncOpenAI

from core.tools import run_web_search
from schemas.events import AgentEvent, AgentName
from schemas.requests import TripRequest

AGENT: AgentName = "flight"


async def run_flight_agent(
    request: TripRequest, queue: asyncio.Queue[AgentEvent]
) -> str:
    try:
        await queue.put(
            AgentEvent(
                agent=AGENT,
                type="thinking",
                data=f"Researching flights from {request.origin} to {request.destination}...",
            )
        )

        r1 = await run_web_search(
            f"flights {request.origin} to {request.destination} {request.departure_date}",
            AGENT,
            queue,
        )
        r2 = await run_web_search(
            f"flight prices {request.origin} {request.destination} {request.currency} 2025",
            AGENT,
            queue,
        )

        context = "\n\n".join(
            str(r.get("content") or r.get("snippet") or "")
            for results in [r1, r2]
            for r in results
        )

        prompt = (
            f"Research flights from {request.origin} to {request.destination} "
            f"around {request.departure_date}. Provide realistic price ranges in {request.currency}, "
            f"best booking windows, recommended airlines, and note any common stopovers."
            f"\n\nResearch data:\n{context}"
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
        logger.exception("flight_agent failed")
        await queue.put(AgentEvent(agent=AGENT, type="error", data="Flight research failed"))
        return ""
