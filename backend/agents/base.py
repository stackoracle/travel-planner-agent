from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod

from schemas.events import AgentEvent
from schemas.requests import TripRequest


class BaseAgent(ABC):
    @abstractmethod
    async def run(
        self, request: TripRequest, queue: asyncio.Queue[AgentEvent]
    ) -> str: ...
