from __future__ import annotations

import asyncio
import os

from loguru import logger
from openai import AsyncOpenAI

from core.tools import run_web_search
from schemas.events import AgentEvent, AgentName
from schemas.requests import TripRequest

AGENT: AgentName = "destination"


async def run_destination_agent(
    request: TripRequest, queue: asyncio.Queue[AgentEvent]
) -> str:
    try:
        await queue.put(
            AgentEvent(
                agent=AGENT,
                type="thinking",
                data=f"Researching {request.destination}...",
            )
        )

        r1 = await run_web_search(
            f"top attractions {request.destination} 2025", AGENT, queue
        )
        r2 = await run_web_search(
            f"best neighbourhoods to stay {request.destination}", AGENT, queue
        )
        r3 = await run_web_search(
            f"must-try food experiences {request.destination}", AGENT, queue
        )

        context = "\n\n".join(
            str(r.get("content") or r.get("snippet") or "")
            for results in [r1, r2, r3]
            for r in results
        )

        prompt = (
            "You are a seasoned travel writer. Research the top attractions, "
            "best neighbourhoods to stay in, and must-try local food and "
            f"experiences in {request.destination}. "
            "Be specific and practical, not generic."
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
        logger.exception("destination_agent failed")
        await queue.put(
            AgentEvent(agent=AGENT, type="error", data="Destination research failed")
        )
        return ""
