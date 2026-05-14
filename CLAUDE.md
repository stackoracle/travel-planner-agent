# Waypoint — AI Travel Planner Agent · CLAUDE.md

> Multi-agent travel planning tool with real-time streaming output.
> Built as a portfolio project to showcase agentic AI, SSE streaming, parallel tool use, and rich UI.
> Five agents research in parallel and synthesise a complete trip package.

---

## Stack

**Frontend:** Next.js (App Router) · Turbopack · shadcn/ui · Tailwind · Zustand · Framer Motion

**Backend:** FastAPI · Uvicorn · Pydantic v2 · OpenAI · SSE-Starlette · Loguru · Ruff · Mypy

**External APIs:** Tavily (web search) · Open-Meteo (weather, free, no key) · ExchangeRate-API (currency, free tier) · Google Maps Embed (free tier)

---

## What It Does

The user describes a trip: destination, origin, dates, budget, travel style.
Five agents run — four in parallel, one synthesises after.

| Agent                 | Role                                            | Tools Used        |
| --------------------- | ----------------------------------------------- | ----------------- |
| `destination_agent` | Top attractions, neighbourhoods, local tips     | Tavily web search |
| `flight_agent`      | Flight routes, typical prices, booking advice   | Tavily web search |
| `hotel_agent`       | Accommodation options matched to budget + style | Tavily web search |
| `weather_agent`     | Forecast for travel dates + packing advice      | Open-Meteo API    |
| `itinerary_agent`   | Day-by-day plan synthesising all agent outputs  | None (LLM only)   |

`itinerary_agent` runs only after all four parallel agents emit `complete`.

---

## Folder Structure

```
/
├── frontend/         ← Next.js App Router + Turbopack + shadcn/ui
└── backend/          ← FastAPI + OpenAI streaming + external APIs
```

### `backend/`

```
backend/
├── main.py
├── pyproject.toml
├── lint.py
├── .env
├── agents/
│   ├── __init__.py
│   ├── base.py
│   ├── destination_agent.py
│   ├── flight_agent.py
│   ├── hotel_agent.py
│   ├── weather_agent.py
│   └── itinerary_agent.py
├── core/
│   ├── orchestrator.py
│   ├── streaming.py
│   ├── job_store.py
│   └── tools.py                ← All external API wrappers live here
├── schemas/
│   ├── events.py
│   ├── requests.py
│   └── responses.py
└── api/
    └── routes.py
```

### `frontend/`

```
frontend/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── components.json
├── app/
│   ├── layout.tsx
│   ├── page.tsx                ← Landing / trip input
│   └── trip/
│       └── [jobId]/
│           └── page.tsx        ← Live planning dashboard
├── components/
│   ├── ui/                     ← shadcn/ui primitives
│   ├── input/
│   │   └── TripForm.tsx
│   ├── dashboard/
│   │   ├── AgentStatusPanel.tsx   ← Left column
│   │   ├── MapPanel.tsx           ← Center column
│   │   ├── LiveFeedPanel.tsx      ← Right column
│   │   └── ItineraryPanel.tsx     ← Bottom reveal
│   ├── cards/
│   │   ├── AgentCard.tsx
│   │   ├── DayCard.tsx
│   │   ├── WeatherCard.tsx
│   │   ├── FlightCard.tsx
│   │   └── HotelCard.tsx
│   └── shared/
│       ├── StatusDot.tsx
│       ├── AgentBadge.tsx
│       └── StreamingText.tsx
├── hooks/
│   └── useAgentStream.ts
├── store/
│   └── tripStore.ts
└── lib/
    └── api.ts
```

---

## 1. Backend Setup

### Install

```bash
cd backend
uv sync          # installs all deps from pyproject.toml into .venv
```

### `.env`

```
OPENAI_API_KEY=your_key
TAVILY_API_KEY=your_key
EXCHANGERATE_API_KEY=your_key   # free at exchangerate-api.com
GOOGLE_MAPS_EMBED_KEY=your_key  # free tier, Maps Embed API only
# Open-Meteo: no key required
```

### `pyproject.toml`

```toml
[project]
name = "waypoint-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi",
    "uvicorn",
    "python-dotenv",
    "openai",
    "httpx",
    "sse-starlette",
    "tavily-python",
    "pydantic>=2.0",
    "loguru",
]

[dependency-groups]
dev = ["ruff", "mypy"]

[tool.ruff]
line-length = 88
select = ["E", "F", "I", "UP", "B"]
ignore = []

[tool.ruff.format]
quote-style = "double"

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true
```

### `lint.py`

```python
import subprocess
import sys

steps = [
    ["ruff", "check", "--fix", "."],
    ["ruff", "format", "."],
    ["mypy", "."],
]

for cmd in steps:
    if subprocess.run(cmd).returncode != 0:
        sys.exit(1)
```

Run with `uv run python lint.py` from `backend/`.

### `main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from api.routes import router

logger.add("logs/app.log", rotation="10 MB", retention="7 days", level="INFO")

app = FastAPI(title="Waypoint Travel Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.on_event("startup")
async def startup() -> None:
    logger.info("Waypoint API started")
```

---

## 2. Pydantic Schemas

### `schemas/events.py`

```python
from pydantic import BaseModel
from typing import Literal

AgentName = Literal[
    "destination", "flight", "hotel", "weather", "itinerary", "system"
]

EventType = Literal[
    "thinking",     # Agent declared intent — before any I/O
    "token",        # Single streaming LLM token
    "tool_call",    # data = tool name + query, shown inline in UI
    "tool_result",  # data = brief summary of tool response
    "complete",     # data = full accumulated output string
    "error",        # data = error message
    "done",         # System sentinel — stream ends after this
]

class AgentEvent(BaseModel):
    agent: AgentName
    type: EventType
    data: str
```

### `schemas/requests.py`

```python
from pydantic import BaseModel

class TripRequest(BaseModel):
    destination: str              # "Tokyo, Japan"
    origin: str                   # "Amsterdam"
    departure_date: str           # ISO: "2025-09-01"
    return_date: str              # ISO: "2025-09-10"
    budget: str                   # "budget" | "mid-range" | "luxury"
    travel_style: str             # "adventure" | "cultural" | "relaxation" | "foodie"
    travelers: int = 2
    currency: str = "EUR"
```

### `schemas/responses.py`

```python
from pydantic import BaseModel

class DayPlan(BaseModel):
    day: int
    date: str
    morning: str
    afternoon: str
    evening: str
    accommodation: str
    estimated_cost: str

class TripResult(BaseModel):
    job_id: str
    destination: str
    destination_summary: str
    flight_summary: str
    hotel_summary: str
    weather_summary: str
    itinerary: list[DayPlan]
    total_estimated_cost: str
    packing_list: list[str]
    map_query: str               # Cleaned destination string for Maps embed
```

---

## 3. SSE Event Stream

Wire format — one JSON object per `data:` line, separated by `\n\n`:

```
data: {"agent": "destination", "type": "thinking",    "data": "Researching Tokyo..."}

data: {"agent": "destination", "type": "tool_call",   "data": "web_search('Tokyo best neighbourhoods 2025')"}

data: {"agent": "destination", "type": "tool_result", "data": "Found 8 results: Shinjuku, Shibuya, Asakusa..."}

data: {"agent": "destination", "type": "token",       "data": "Tokyo is best explored by neighbourhood..."}

data: {"agent": "weather",     "type": "tool_call",   "data": "open_meteo(lat=35.68, lon=139.69, start=2025-09-01)"}

data: {"agent": "weather",     "type": "tool_result", "data": "Sep 1–10: 28°C avg, 3 rain days expected"}

data: {"agent": "itinerary",   "type": "complete",    "data": "[full itinerary text]"}

data: {"agent": "system",      "type": "done",        "data": ""}
```

---

## 4. API Routes — `api/routes.py`

```python
POST /api/plan              # TripRequest → { job_id: str }
GET  /api/stream/{job_id}   # SSE stream of AgentEvent (text/event-stream)
GET  /api/result/{job_id}   # → TripResult
```

---

## 5. Tools — `core/tools.py`

```python
# All external API calls live here.
# Each public function emits tool_call + tool_result events before/after the call.

async def run_web_search(
    query: str, agent: AgentName, queue: asyncio.Queue[AgentEvent],
    max_results: int = 5,
) -> list[dict]:
    await queue.put(AgentEvent(agent=agent, type="tool_call",
                               data=f"web_search('{query}')"))
    results = await _tavily_search(query, max_results)
    await queue.put(AgentEvent(agent=agent, type="tool_result",
                               data=f"Found {len(results)} results"))
    return results

async def run_weather_forecast(
    destination: str, start_date: str, end_date: str,
    agent: AgentName, queue: asyncio.Queue[AgentEvent],
) -> dict:
    lat, lon = await _geocode(destination)   # Open-Meteo geocoding, free
    await queue.put(AgentEvent(agent=agent, type="tool_call",
                               data=f"open_meteo(lat={lat:.2f}, lon={lon:.2f}, {start_date}→{end_date})"))
    forecast = await _open_meteo_forecast(lat, lon, start_date, end_date)
    await queue.put(AgentEvent(agent=agent, type="tool_result",
                               data=f"{len(forecast['daily']['time'])} days of forecast retrieved"))
    return forecast

async def run_currency_convert(
    amount: float, from_currency: str, to_currency: str,
    agent: AgentName, queue: asyncio.Queue[AgentEvent],
) -> float:
    await queue.put(AgentEvent(agent=agent, type="tool_call",
                               data=f"currency_convert({amount} {from_currency} → {to_currency})"))
    result = await _exchangerate_convert(amount, from_currency, to_currency)
    await queue.put(AgentEvent(agent=agent, type="tool_result",
                               data=f"{amount} {from_currency} = {result:.2f} {to_currency}"))
    return result

# Private helpers (no queue):
async def _tavily_search(query: str, max_results: int) -> list[dict]: ...
async def _geocode(place: str) -> tuple[float, float]: ...
async def _open_meteo_forecast(lat: float, lon: float, start: str, end: str) -> dict: ...
async def _exchangerate_convert(amount: float, frm: str, to: str) -> float: ...
```

---

## 6. Orchestrator — `core/orchestrator.py`

```python
async def run_trip_planning(
    request: TripRequest,
    job_id: str,
    queue: asyncio.Queue[AgentEvent],
) -> None:
    # Step 1 — four agents in parallel
    results = await asyncio.gather(
        run_destination_agent(request, queue),
        run_flight_agent(request, queue),
        run_hotel_agent(request, queue),
        run_weather_agent(request, queue),
        return_exceptions=True,
    )
    # Step 2 — itinerary after all complete
    await run_itinerary_agent(request, results, queue)
    # Step 3 — close stream
    await queue.put(AgentEvent(agent="system", type="done", data=""))
```

---

## 7. Agent Contracts — `agents/base.py`

Every agent must:

* Accept `request: TripRequest` and `queue: asyncio.Queue[AgentEvent]`
* Use `AgentEvent` Pydantic model for all emitted events — never raw dicts
* Emit `thinking` before any tool call or LLM call
* Call external APIs only via `core/tools.py` wrappers — never inline
* Stream LLM output token-by-token via `token` events (OpenAI `stream=True`)
* Emit `complete` with full accumulated output when done
* Catch all exceptions → emit `error` event + `logger.exception`
* All functions fully type-annotated — `mypy --strict` must pass

---

## 8. Agents

### `destination_agent`

* 2–3 Tavily searches: top attractions, best neighbourhoods, must-try food/experiences
* Output: curated spot list, neighbourhood guide, insider tips
* Prompt: *"You are a seasoned travel writer. Research the top attractions, best neighbourhoods to stay in, and must-try local food and experiences in {destination}. Be specific and practical, not generic."*

### `flight_agent`

* 2 Tavily searches: flight routes from origin, current price ranges
* Output: available routes, realistic price range in user's currency, best booking window, airline recommendations
* Prompt: *"Research flights from {origin} to {destination} around {departure_date}. Provide realistic price ranges in {currency}, best booking windows, recommended airlines, and note any common stopovers."*

### `hotel_agent`

* 2 Tavily searches: accommodation matching budget + travel style
* Output: 3–5 specific recommendations with area, price range per night, and fit rationale
* Prompt: *"Find {budget} accommodation in {destination} for a {travel_style} traveller. Recommend 3–5 specific hotels, hostels, or apartments. Include neighbourhood, nightly price range in {currency}, and one sentence on why each suits this trip."*

### `weather_agent`

* Geocode destination → `run_weather_forecast` → currency convert if needed
* No LLM for data retrieval — direct API calls only
* LLM used only to produce packing advice from raw forecast
* Output: day-by-day forecast summary + practical packing list
* Prompt: *"Given this weather forecast for {destination} from {departure_date} to {return_date}: {forecast_json}. Write a 2-paragraph weather summary and a practical packing list for a {travel_style} trip."*

### `itinerary_agent`

* Receives all four agent output strings as context
* Runs only after all four emit `complete`
* Produces JSON parseable into `list[DayPlan]` — one entry per travel day
* Also produces `total_estimated_cost`, `packing_list`, `map_query`
* Prompt: *"Using this research — destination guide, flight info, accommodation options, and weather forecast — create a detailed day-by-day itinerary for {travelers} travellers, {n} days in {destination}. Budget: {budget}. Style: {travel_style}. For each day include morning/afternoon/evening activities, where to stay, and estimated daily cost in {currency}. Respond only with valid JSON matching the DayPlan schema."*
* Parse LLM JSON output into `list[DayPlan]` — validate with Pydantic

---

## 9. Frontend Setup

### Install

```bash
cd frontend
pnpm create next-app@latest . --typescript --tailwind --app --turbopack
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add card badge scroll-area progress separator \
  button textarea tabs tooltip select
pnpm add zustand framer-motion
```

### `next.config.ts`

```typescript
import type { NextConfig } from "next"
const nextConfig: NextConfig = { experimental: { turbo: {} } }
export default nextConfig
```

---

## 10. Zustand Store — `store/tripStore.ts`

```typescript
type AgentStatus = 'idle' | 'thinking' | 'active' | 'complete' | 'error'

type AgentState = {
  status: AgentStatus
  output: string
  toolCalls: string[]
  tokenCount: number
  elapsed: number
  startedAt: number | null
}

type LogEntry = {
  time: string       // HH:MM:SS
  agent: string
  type: string
  message: string
}

type Store = {
  request: TripRequest | null
  jobId: string | null
  isRunning: boolean
  agents: Record<string, AgentState>
  logs: LogEntry[]
  result: TripResult | null
  // Actions
  setRequest: (r: TripRequest) => void
  appendToken: (agent: string, token: string) => void
  setStatus: (agent: string, status: AgentStatus) => void
  addToolCall: (agent: string, call: string) => void
  addLog: (entry: LogEntry) => void
  setResult: (result: TripResult) => void
  reset: () => void
}
```

---

## 11. SSE Hook — `hooks/useAgentStream.ts`

```typescript
export function useAgentStream(jobId: string | null) {
  // Open EventSource to GET /api/stream/{jobId}
  // Parse each SSE data line as AgentEvent JSON
  // Dispatch to Zustand:
  //   thinking    → setStatus('thinking'), addLog
  //   token       → appendToken, setStatus('active')
  //   tool_call   → addToolCall, addLog
  //   tool_result → addLog
  //   complete    → setStatus('complete')
  //   error       → setStatus('error'), addLog
  //   done        → fetch /api/result/{jobId} → setResult, isRunning = false
  // Reconnect on disconnect: exponential backoff, max 3 retries
  // Cleanup EventSource on unmount
}
```

---

## 12. UI Design

### Aesthetic Direction: **Warm Editorial Travel Magazine**

Not a dark dashboard. Not a SaaS product.
Think Condé Nast Traveler meets a live intelligence feed.
Light, airy, generous — a single warm terracotta accent, rich serif display type for the destination name.
The map is the hero. Everything else frames it.

### Colors

```css
--bg-base:         #FAFAF8;   /* warm off-white, paper-like */
--bg-surface:      #FFFFFF;
--bg-muted:        #F4F1EC;   /* card and input backgrounds */
--border:          #E8E2D9;

--accent:          #E8652A;   /* terracotta — the single bold color */
--accent-light:    #FDF0EA;   /* tint for hover/selected states */
--accent-dark:     #B84D1A;   /* darker for pressed states */

--text-primary:    #1A1614;
--text-secondary:  #6B6459;
--text-muted:      #A89E94;

/* Agent identity — warm, distinct */
--agent-destination: #E8652A;   /* terracotta */
--agent-flight:      #2A6EE8;   /* sky blue */
--agent-hotel:       #2AAE8C;   /* teal */
--agent-weather:     #C49A00;   /* golden */
--agent-itinerary:   #8B3A8B;   /* plum */
```

### Typography

```
Display (destination name, hero):   "Playfair Display" — serif, editorial
UI labels, body, inputs:            "DM Sans" — clean, warm, readable
Tool calls, timestamps, monospace:  "JetBrains Mono"
```

```typescript
import { Playfair_Display, DM_Sans, JetBrains_Mono } from 'next/font/google'
```

### Animations (Framer Motion)

* Agent cards: slide up `y: 16 → 0` + `opacity: 0 → 1` on first appearance, 80ms stagger
* Tool call events: 300ms border pulse on the agent card in agent color
* Itinerary day cards: stagger reveal left-to-right, 60ms per card
* Itinerary panel: `y: 40 → 0` + `opacity: 0 → 1` over 400ms when synthesis completes
* Overall progress bar: smooth width transition as each agent completes
* Streaming text: append with no animation — let content flow naturally
* Landing page: destination name large serif preview updates live as user types

---

## 13. Pages

### `app/page.tsx` — Landing / Trip Input

Full viewport, centered content, no scroll needed.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   Where are you going?                               │   ← Playfair Display, 48px
│                                                      │
│   ┌──────────────────────────────────────────────┐   │
│   │  Tokyo, Japan                                │   │   ← large input, DM Sans 24px
│   └──────────────────────────────────────────────┘   │
│                                                      │
│   From              Dates                            │
│   [ Amsterdam  ▾]   [ Sep 1, 2025 → Sep 10, 2025 ]  │
│                                                      │
│   Travelers         Currency                         │
│   [ 2 people  ▾]    [ EUR  ▾]                        │
│                                                      │
│   Budget                  Travel style               │
│   ┌──────────┐            ┌────────────┐             │
│   │ Budget   │            │ Adventure  │             │
│   └──────────┘            └────────────┘             │
│   ┌──────────┐ ←selected  ┌────────────┐ ←selected  │
│   │Mid-range │ (accented) │ Cultural   │ (accented)  │
│   └──────────┘            └────────────┘             │
│   ┌──────────┐            ┌────────────┐             │
│   │ Luxury   │            │ Relaxation │             │
│   └──────────┘            └────────────┘             │
│                           ┌────────────┐             │
│                           │  Foodie    │             │
│                           └────────────┘             │
│                                                      │
│              [ ✈  Plan my trip ]                     │   ← accent button, full width
│                                                      │
└──────────────────────────────────────────────────────┘
```

* Background: `--bg-base` with a faint large watermark of a destination photo (CSS `opacity: 0.04`)
* Destination input: prominent, Playfair Display as placeholder text
* Budget + style: radio tile cards — `--bg-muted` default, `--accent-light` border + background when selected
* Button: `--accent` fill, white text, 4px radius, full-width on mobile
* On submit → POST `/api/plan` → redirect to `/trip/[jobId]`

### `app/trip/[jobId]/page.tsx` — Live Planning Dashboard

Three-column layout + bottom reveal. Full viewport, no page scroll.

```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER  ✈ Waypoint  ·  Tokyo, Japan  ·  Sep 1–10  ·  2 travelers  │  56px
├────────────────┬───────────────────────────┬───────────────────────┤
│ AGENT STATUS   │  MAP                      │ LIVE FEED             │
│ (240px fixed)  │  (flex-1)                 │ (320px fixed)         │
│                │                           │                       │
│ ○ destination  │  ┌─────────────────────┐  │ ┌─ destination ─────┐ │
│   thinking     │  │                     │  │ │ > web_search(...) │ │
│                │  │  Google Maps embed  │  │ │ Tokyo is best...  │ │
│ ○ flights      │  │  (destination pin)  │  │ └───────────────────┘ │
│   active       │  │                     │  │                       │
│                │  └─────────────────────┘  │ ┌─ flights ─────────┐ │
│ ✓ hotels       │                           │ │ AMS→NRT from €680 │ │
│   complete     │                           │ │ [complete]        │ │
│                │                           │ └───────────────────┘ │
│ ○ weather      │                           │                       │
│   active       │                           │ ┌─ weather ─────────┐ │
│                │                           │ │ 28°C avg, 3 rain  │ │
│ ○ itinerary    │                           │ │ days expected...  │ │
│   waiting      │                           │ └───────────────────┘ │
│                │                           │                       │
│ ──────────── │                           │ ┌─ hotels ──────────┐ │
│ Overall  60%   │                           │ │ [complete]        │ │
│ ██████░░░░     │                           │ └───────────────────┘ │
└────────────────┴───────────────────────────┴───────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ ITINERARY  (hidden → animates in when itinerary_agent completes)   │
│                                                                    │
│ Day 1 · Sep 1     Day 2 · Sep 2     Day 3 · Sep 3     [→ scroll]  │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐             │
│ │ ☀ Morning     │ │ ☀ Morning     │ │ ...           │             │
│ │ Tsukiji mkt   │ │ Shinjuku Gyoen│ │               │             │
│ │               │ │               │ │               │             │
│ │ 🌤 Afternoon  │ │ 🌤 Afternoon  │ │               │             │
│ │ Senso-ji      │ │ Harajuku      │ │               │             │
│ │               │ │               │ │               │             │
│ │ 🌙 Evening    │ │ 🌙 Evening    │ │               │             │
│ │ Izakaya dinner│ │ Shinjuku bars │ │               │             │
│ │               │ │               │ │               │             │
│ │ ~€85/person   │ │ ~€90/person   │ │               │             │
│ └───────────────┘ └───────────────┘ └───────────────┘             │
└────────────────────────────────────────────────────────────────────┘
```

**Left column — Agent Status Panel (240px)**

* One row per agent: `StatusDot` + name (colored) + status text + elapsed timer
* Tool call count when > 0: small muted label `3 searches`
* Overall `Progress` bar at bottom — advances 20% per completed agent
* No scroll — fixed height

**Center — Map Panel (flex-1)**

* Google Maps embed: `<iframe src="https://www.google.com/maps/embed/v1/place?key={KEY}&q={map_query}" />`
* Fills panel fully, no padding, no border
* `map_query` set from `TripResult.map_query` once job completes; defaults to destination string while loading

**Right column — Live Feed (320px)**

* `AgentCard` per agent, appears via `AnimatePresence` on first event
* Stack vertically, full column scrolls with shadcn `ScrollArea`
* Each card: colored left border + agent name header + streaming body
* Tool call lines: `> query string` in JetBrains Mono, `--text-muted`
* Body max-height 200px, overflows with inner `ScrollArea`

**Bottom — Itinerary Panel**

* `display: none` until `itinerary_agent` emits `complete`
* Animates in with Framer Motion
* Horizontal scroll of `DayCard` components — one per travel day
* Fixed height ~280px

---

## 14. Key Components

### `AgentCard.tsx`

```tsx
// Left border: 3px solid var(--agent-{name})
// Header: StatusDot + agent name in agent color + elapsed timer (right-aligned)
// Body: StreamingText — tokens append progressively
// Tool call rows: "> query" in JetBrains Mono, --text-muted, 12px
// Max body height: 200px, inner ScrollArea for overflow
// Appears via AnimatePresence: y:16→0, opacity:0→1
// Border pulses in agent color for 300ms on each tool_call event
```

### `DayCard.tsx`

```tsx
// Fixed width: 240px
// Header: "Day {n} · {date}" — Playfair Display 16px
// Three sections: Morning / Afternoon / Evening — each with emoji + text
// Footer: accommodation name + estimated daily cost in accent color
// Weather icon for the day (from packing_list or weather summary)
// --bg-muted background, --border border, 8px radius
```

### `WeatherCard.tsx`

```tsx
// Rendered inside weather AgentCard body once complete
// Compact 7-day strip: one cell per day
// Each cell: weather emoji + high temp + low temp
// Weather code → emoji map:
//   0-2: ☀️   3: 🌤   45-48: 🌫   51-67: 🌧   71-77: 🌨   80-82: 🌦   95-99: ⛈
```

### `FlightCard.tsx`

```tsx
// Route display: "{origin} → {destination}" with ✈ icon
// Price range prominent: "from €680 return" in --accent color
// Booking window note below
// Airline list as small text badges
```

### `HotelCard.tsx`

```tsx
// Three tiles side by side
// Each: hotel name + area badge + price/night + one-line description
// Budget tier badge in top-right corner
```

### `StatusDot.tsx`

```tsx
// idle:     12px hollow circle, --text-muted border
// thinking: 12px filled, agent color, opacity pulse 1.5Hz CSS animation
// active:   12px filled, agent color, scale pulse 2Hz CSS animation
// complete: ✓ checkmark icon, agent color, static
// error:    × icon, red, static
```

### `StreamingText.tsx`

```tsx
// Uses useRef to append tokens to a DOM text node — no React re-render per token
// Blinking cursor (|) appended while agent status is active
// Cursor removed on complete
// Font: DM Sans 14px for prose, JetBrains Mono for tool output
```

---

## 15. API Client — `lib/api.ts`

```typescript
export const startTrip = async (
  payload: TripRequest
): Promise<{ job_id: string }>

export const getResult = async (
  jobId: string
): Promise<TripResult>
```

---

## 16. Build Order

### Step 1 — Backend Core

1. Create `backend/` structure
2. `pyproject.toml` — Ruff + Mypy config
3. All `schemas/` Pydantic models
4. `main.py` — FastAPI + CORS + Loguru
5. `core/job_store.py` — uuid4 in-memory registry
6. `core/tools.py` — all four tool wrappers with event emission
7. `core/streaming.py` — SSE formatter
8. `api/routes.py` — 3 endpoints
9. `agents/base.py` — abstract base, type contracts
10. `uv run python lint.py` — fix all errors

### Step 2 — Agents

1. `weather_agent` first — simplest: geocode → forecast → LLM packing advice
2. `destination_agent` — Tavily × 3, stream output
3. `hotel_agent` — Tavily × 2, stream output
4. `flight_agent` — Tavily × 2, stream output
5. `core/orchestrator.py` — `asyncio.gather` all four
6. `itinerary_agent` — receives all outputs, produces `list[DayPlan]` JSON, Pydantic-validated
7. `uv run python lint.py`
8. End-to-end test: POST → full SSE stream → `TripResult` with structured itinerary

### Step 3 — Frontend Foundation

1. Next.js + Turbopack + shadcn init
2. All shadcn components + Zustand + Framer Motion
3. Tailwind CSS variables — warm editorial palette
4. `store/tripStore.ts`
5. `hooks/useAgentStream.ts`

### Step 4 — UI Pages

1. `app/page.tsx` — trip input form, radio tile cards for budget + style
2. Three-column dashboard shell — get layout right before adding content
3. `StatusDot` + `AgentBadge` + `StreamingText` shared components
4. `AgentCard` — wired to Zustand, live token append, tool call rows
5. Left status panel — agent rows + overall progress bar
6. Google Maps embed panel
7. `WeatherCard`, `FlightCard`, `HotelCard` — rendered inside agent cards
8. `DayCard` + itinerary horizontal scroll panel
9. `AnimatePresence` on itinerary panel reveal

### Step 5 — Polish

1. Framer Motion: agent card stagger, itinerary reveal, tool call border pulse
2. `StreamingText` cursor blink while active, disappears on complete
3. Weather code → emoji mapping in `WeatherCard`
4. Live destination preview on landing page as user types
5. Mobile layout: stack columns, map collapses to 200px strip, itinerary scrolls vertically
6. Error states: agent card body shows error message inline, progress stalls, no crash
7. Currency formatting via `Intl.NumberFormat` throughout
8. End-to-end test with a real trip: "Amsterdam to Tokyo, Sep 1–10, mid-range, cultural"

---

## 17. Key Rules

**Backend**

* `asyncio.gather` for the four parallel agents — never sequential
* Every agent emits `thinking` before any tool call or LLM call
* All backend code passes `uv run python lint.py` before commit
* `AgentEvent` Pydantic model for every SSE event — never raw dicts
* All external API calls go through `core/tools.py` wrappers — never inline in agents
* Tool wrappers always emit `tool_call` before calling and `tool_result` after
* SSE stays open until `system.done` — never close early
* `itinerary_agent` starts only after all four parallel agents emit `complete`
* `itinerary_agent` output is Pydantic-validated into `list[DayPlan]` — never stored as raw string
* Token streaming uses OpenAI `stream=True` — never batch completion

**Frontend**

* No page-level scroll on the dashboard — columns scroll internally via shadcn `ScrollArea`
* `StreamingText` uses `useRef` for token append — no React state re-render per token
* Google Maps embed is a plain `<iframe>` — no Maps JS SDK, no additional bundle cost
* Itinerary panel starts hidden; `AnimatePresence` handles the reveal
* Agent cards appear via `AnimatePresence` — not pre-rendered as empty placeholders
* Use shadcn primitives — do not rebuild `ScrollArea`, `Progress`, `Select`, `Badge`, `Tabs`
* Turbopack stays enabled in `next.config.ts`
* Warm editorial palette only — no dark mode, no additional accent colors
* Currency formatted via `Intl.NumberFormat` — never hardcoded symbol strings
