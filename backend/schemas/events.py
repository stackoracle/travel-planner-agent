from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

AgentName = Literal["destination", "flight", "hotel", "weather", "itinerary", "system"]

EventType = Literal[
    "thinking",
    "token",
    "tool_call",
    "tool_result",
    "complete",
    "error",
    "done",
]


class AgentEvent(BaseModel):
    agent: AgentName
    type: EventType
    data: str
