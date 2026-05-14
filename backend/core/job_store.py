from __future__ import annotations

import asyncio
import uuid

from schemas.events import AgentEvent
from schemas.responses import TripResult


class Job:
    def __init__(self, job_id: str) -> None:
        self.job_id = job_id
        self.queue: asyncio.Queue[AgentEvent] = asyncio.Queue()
        self.result: TripResult | None = None


_jobs: dict[str, Job] = {}


def create_job() -> Job:
    job_id = str(uuid.uuid4())
    job = Job(job_id)
    _jobs[job_id] = job
    return job


def get_job(job_id: str) -> Job | None:
    return _jobs.get(job_id)
