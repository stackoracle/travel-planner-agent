from __future__ import annotations

import asyncio
import os

from loguru import logger
from openai import AsyncOpenAI

from core.tools import run_web_search
from schemas.events import AgentEvent, AgentName
from schemas.requests import TripRequest

AGENT: AgentName = "hotel"


async def run_hotel_agent(
    request: TripRequest, queue: asyncio.Queue[AgentEvent]
) -> str:
    try:
        await queue.put(
            AgentEvent(
                agent=AGENT,
                type="thinking",
                data=f"Searching {request.budget} accommodation in {request.destination}...",
            )
        )

        r1 = await run_web_search(
            f"{request.budget} hotels {request.destination} {request.travel_style} traveller",
            AGENT,
            queue,
        )
        r2 = await run_web_search(
            f"best {request.budget} accommodation {request.destination} 2025",
            AGENT,
            queue,
        )

        context = "\n\n".join(
            str(r.get("content") or r.get("snippet") or "")
            for results in [r1, r2]
            for r in results
        )

        prompt = (
            f"Find {request.budget} accommodation in {request.destination} for a "
            f"{request.travel_style} traveller. Recommend 3–5 specific hotels, hostels, or apartments. "
            f"Include neighbourhood, nightly price range in {request.currency}, and one sentence on "
            f"why each suits this trip.\n\nResearch data:\n{context}"
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
        logger.exception("hotel_agent failed")
        await queue.put(AgentEvent(agent=AGENT, type="error", data="Hotel research failed"))
        return ""
