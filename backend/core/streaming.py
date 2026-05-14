from __future__ import annotations

from schemas.events import AgentEvent


def format_sse(event: AgentEvent) -> str:
    return f"data: {event.model_dump_json()}\n\n"
