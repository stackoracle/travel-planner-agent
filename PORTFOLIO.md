# TripAssist - AI Travel Planner Agent

**A multi-agent trip planner with real-time streaming output.** A user describes a trip and five agents research it live: four run in parallel over web search and weather APIs, a fifth synthesises everything into a day-by-day itinerary, all streamed to the UI as it happens.

**Role:** Agentic AI Engineer / Full Stack

---

## Agentic AI

Five GPT-4o-driven agents - four fanned out concurrently, one synthesising after - coordinated by an orchestrator over a typed SSE event stream.

```
TripRequest
    │
    ▼
Orchestrator ──┬──▶ Destination Agent (Tavily)
               ├──▶ Flight Agent (Tavily)
               ├──▶ Hotel Agent (Tavily)
               └──▶ Weather Agent (Open-Meteo)
                        │  (all complete)
                        ▼
                Itinerary Agent (LLM synthesis)
                        │
                        ▼
              TripResult (day-by-day plan)
```

| Agent | Role | Tools |
|-------|------|-------|
| **Destination Agent** | Top attractions, neighbourhoods, local tips | Tavily web search |
| **Flight Agent** | Routes, price ranges, booking advice | Tavily web search |
| **Hotel Agent** | Accommodation matched to budget + style | Tavily web search |
| **Weather Agent** | Forecast + packing advice | Open-Meteo API |
| **Itinerary Agent** | Day-by-day synthesis of all four outputs | LLM only |

**Differentiating engineering:**

- **`asyncio.gather` fan-out, sequential fan-in** - four research agents run concurrently; the Itinerary Agent starts only once all four emit `complete`, then reduces their output into one structured plan.
- **Typed SSE contract, not ad hoc events** - every emission is an `AgentEvent` Pydantic model (`thinking` / `token` / `tool_call` / `tool_result` / `complete` / `error` / `done`) on one stream, so the frontend renders live reasoning, not just a spinner.
- **Tool calls as observable events** - every external call (Tavily search, Open-Meteo forecast, currency conversion) is wrapped in `core/tools.py` and brackets itself with `tool_call` / `tool_result` events, visible in the UI the instant they happen.
- **Schema-validated synthesis output** - the Itinerary Agent emits JSON, parsed and validated into `list[DayPlan]` via Pydantic rather than stored raw, so a malformed response fails loudly instead of corrupting the UI.
- **Token-level streaming throughout** - all LLM output uses OpenAI `stream=True`, forwarded token-by-token, never batched.

---

## Full Stack

**Backend - FastAPI (Python 3.11+, async)**
- Orchestration (`core/orchestrator.py`) coordinating four parallel research agents and one synthesis agent
- Three endpoints on one job model: `POST /api/plan`, `GET /api/stream/{job_id}` (SSE), `GET /api/result/{job_id}`
- Pydantic v2 models for every request/event/response; `uv` for deps, `ruff` + `mypy --strict` gates, Loguru logging

**Frontend - Next.js (App Router) + Turbopack**
- Landing page with live-updating serif destination preview, radio-tile budget/style selectors
- Three-column live dashboard: agent status panel, Google Maps embed (hero), scrolling live feed of agent cards
- `useAgentStream` hook owns the `EventSource` lifecycle with backoff reconnect; Zustand dispatches typed events into per-agent state
- `StreamingText` appends tokens via `useRef` DOM writes - zero React re-renders per token
- Warm editorial design: off-white background, single terracotta accent, per-agent colors, Playfair Display headings, DM Sans UI, JetBrains Mono traces
- Framer Motion: staggered card reveal, tool-call border pulse, itinerary slide-in on completion

---

## Tech Stack

`Python 3.11` · `FastAPI` · `Pydantic v2` · `OpenAI GPT-4o` · `Tavily` · `Open-Meteo` · `ExchangeRate-API` · `sse-starlette` · `uv` · `ruff` · `mypy` · `Next.js` · `TypeScript` · `Turbopack` · `shadcn/ui` · `Tailwind` · `Zustand` · `Framer Motion` · `Google Maps Embed` · `pnpm`
