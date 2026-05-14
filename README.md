# Waypoint - AI Travel Planner

A multi-agent AI travel planning tool that streams a complete trip package in real time. Five specialised agents run in parallel and synthesise destination research, flights, hotels, weather, and a day-by-day itinerary - all visible live in the browser as they work.

Built as a portfolio project to demonstrate agentic AI architecture, SSE streaming, parallel tool use, and a polished editorial UI.

---

## Demo

![Dashboard showing live agent feed, interactive map, and itinerary cards](.github/demo.png)

---

## How It Works

The user fills in a trip form (destination, origin, dates, budget, travel style). On submit:

1. **Four agents start in parallel** - each researches one dimension of the trip.
2. **Results stream to the browser in real time** via Server-Sent Events.
3. **Itinerary agent runs after all four complete** - synthesises everything into a structured day-by-day plan.
4. **The map updates** - clicking a day card geocodes the day's activity locations and draws an animated curved route between them.

| Agent                 | What it does                                    | API used                  |
| --------------------- | ----------------------------------------------- | ------------------------- |
| `destination_agent` | Top attractions, neighbourhoods, local tips     | Tavily web search         |
| `flight_agent`      | Routes, price ranges, booking advice            | Tavily web search         |
| `hotel_agent`       | Accommodation options matched to budget + style | Tavily web search         |
| `weather_agent`     | Forecast for travel dates + packing advice      | Open-Meteo (free, no key) |
| `itinerary_agent`   | Day-by-day plan synthesising all agent outputs  | GPT-4o-mini               |

---

## Stack

**Frontend** - Next.js 15 (App Router) · Turbopack · Tailwind CSS v4 · shadcn/ui · Zustand · Framer Motion · Leaflet

**Backend** - FastAPI · Uvicorn · OpenAI SDK · SSE-Starlette · Pydantic v2 · httpx · Loguru

**External APIs** - Tavily · Open-Meteo · ExchangeRate-API · Nominatim (geocoding, proxied via backend)

---

## Project Structure

```
.
├── backend/
│   ├── agents/
│   │   ├── destination_agent.py
│   │   ├── flight_agent.py
│   │   ├── hotel_agent.py
│   │   ├── weather_agent.py
│   │   └── itinerary_agent.py
│   ├── core/
│   │   ├── orchestrator.py     # asyncio.gather for parallel agents
│   │   ├── streaming.py        # SSE formatter
│   │   ├── job_store.py        # in-memory job registry
│   │   └── tools.py            # Tavily, Open-Meteo, currency wrappers
│   ├── schemas/
│   │   ├── events.py           # AgentEvent (thinking/token/tool_call/complete/done)
│   │   ├── requests.py         # TripRequest
│   │   └── responses.py        # TripResult, DayPlan
│   ├── api/
│   │   └── routes.py           # POST /plan · GET /stream/:id · GET /result/:id · GET /geocode
│   └── main.py
└── frontend/
    ├── app/
    │   ├── page.tsx             # Trip input form
    │   └── trip/[jobId]/
    │       └── page.tsx         # Live planning dashboard
    ├── components/
    │   ├── dashboard/
    │   │   ├── AgentStatusPanel.tsx
    │   │   ├── LiveFeedPanel.tsx
    │   │   ├── MapPanel.tsx
    │   │   └── ItineraryPanel.tsx
    │   ├── cards/
    │   │   ├── AgentCard.tsx
    │   │   ├── DayCard.tsx
    │   │   ├── WeatherCard.tsx
    │   │   ├── FlightCard.tsx
    │   │   └── HotelCard.tsx
    │   └── shared/
    │       ├── StreamingText.tsx
    │       ├── StatusDot.tsx
    │       └── AgentBadge.tsx
    ├── hooks/
    │   └── useAgentStream.ts    # EventSource + Zustand dispatch
    ├── store/
    │   └── tripStore.ts         # Zustand store
    └── lib/
        └── api.ts               # startTrip / getResult / geocode
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+ with pnpm
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### API Keys

Create `backend/.env`:

```env
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
EXCHANGERATE_API_KEY=...        # free at exchangerate-api.com
```

Open-Meteo and Nominatim (geocoding) require no keys.

### Backend

```bash
cd backend
uv sync
uv run python -m main
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
# → http://localhost:3000
```

---

## API

```
POST /api/plan              TripRequest → { job_id }
GET  /api/stream/:job_id    SSE stream of AgentEvent
GET  /api/result/:job_id    → TripResult (available after stream ends)
GET  /api/geocode?q=...     Nominatim proxy (avoids browser CORS)
```

### SSE event shape

```json
{ "agent": "destination", "type": "token", "data": "Tokyo is best explored…" }
```

`type` is one of: `thinking` · `token` · `tool_call` · `tool_result` · `complete` · `error` · `done`

---

## Key Design Decisions

**Parallel agents via `asyncio.gather`** - the four research agents run concurrently; total wall-clock time is the slowest single agent, not their sum.

**Itinerary agent as synthesiser** - runs only after all four parallel agents emit `complete`, so it has the full context before generating the structured plan.

**Token streaming without re-render thrashing** - `StreamingText` uses React 18's `useDeferredValue` to batch expensive ReactMarkdown re-parses during high-frequency token bursts.

**Geocoding proxied through backend** - Nominatim blocks browser-origin requests; all geocoding goes through `GET /api/geocode` to avoid CORS errors.

**Interactive map with animated routes** - when a day card is selected, the day's activity locations are geocoded and connected with a quadratic bezier arc drawn via SVG `stroke-dashoffset` animation and a custom `<marker>` arrowhead.

**No Maps SDK** - the map is plain Leaflet with OpenStreetMap tiles; no Google Maps JS bundle cost.

---

## Linting (backend)

```bash
cd backend
uv run python lint.py   # ruff check + ruff format + mypy --strict
```
