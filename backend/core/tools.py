from __future__ import annotations

import asyncio
import os
from typing import Any

import httpx
from loguru import logger

from schemas.events import AgentEvent, AgentName


async def run_web_search(
    query: str,
    agent: AgentName,
    queue: asyncio.Queue[AgentEvent],
    max_results: int = 5,
) -> list[dict[str, Any]]:
    await queue.put(
        AgentEvent(agent=agent, type="tool_call", data=f"web_search('{query}')")
    )
    results = await _tavily_search(query, max_results)
    await queue.put(
        AgentEvent(
            agent=agent, type="tool_result", data=f"Found {len(results)} results"
        )
    )
    return results


async def run_weather_forecast(
    destination: str,
    start_date: str,
    end_date: str,
    agent: AgentName,
    queue: asyncio.Queue[AgentEvent],
) -> dict[str, Any]:
    lat, lon = await _geocode(destination)
    await queue.put(
        AgentEvent(
            agent=agent,
            type="tool_call",
            data=f"open_meteo(lat={lat:.2f}, lon={lon:.2f}, {start_date}→{end_date})",
        )
    )
    forecast = await _open_meteo_forecast(lat, lon, start_date, end_date)
    days: list[Any] = forecast.get("daily", {}).get("time", [])
    await queue.put(
        AgentEvent(
            agent=agent,
            type="tool_result",
            data=f"{len(days)} days of forecast retrieved",
        )
    )
    return forecast


async def run_currency_convert(
    amount: float,
    from_currency: str,
    to_currency: str,
    agent: AgentName,
    queue: asyncio.Queue[AgentEvent],
) -> float:
    await queue.put(
        AgentEvent(
            agent=agent,
            type="tool_call",
            data=f"currency_convert({amount} {from_currency} → {to_currency})",
        )
    )
    result = await _exchangerate_convert(amount, from_currency, to_currency)
    await queue.put(
        AgentEvent(
            agent=agent,
            type="tool_result",
            data=f"{amount} {from_currency} = {result:.2f} {to_currency}",
        )
    )
    return result


async def _tavily_search(query: str, max_results: int) -> list[dict[str, Any]]:
    from tavily import TavilyClient

    api_key = os.environ["TAVILY_API_KEY"]

    def _sync() -> list[dict[str, Any]]:
        client = TavilyClient(api_key=api_key)
        response: dict[str, Any] = client.search(query=query, max_results=max_results)
        results: list[dict[str, Any]] = response.get("results", [])
        return results

    try:
        return await asyncio.to_thread(_sync)
    except Exception:
        logger.exception(f"Tavily search failed for query: {query!r}")
        return []


async def _geocode(place: str) -> tuple[float, float]:
    url = "https://geocoding-api.open-meteo.com/v1/search"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params={"name": place, "count": 1})
        resp.raise_for_status()
        data: dict[str, Any] = resp.json()
        results: list[dict[str, Any]] = data.get("results", [])
        if not results:
            raise ValueError(f"Could not geocode '{place}'")
        first = results[0]
        return float(first["latitude"]), float(first["longitude"])


async def _open_meteo_forecast(
    lat: float, lon: float, start: str, end: str
) -> dict[str, Any]:
    url = "https://api.open-meteo.com/v1/forecast"
    params: dict[str, Any] = {
        "latitude": lat,
        "longitude": lon,
        "daily": "weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum",
        "start_date": start,
        "end_date": end,
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        result: dict[str, Any] = resp.json()
        return result


async def _exchangerate_convert(amount: float, frm: str, to: str) -> float:
    url = "https://api.frankfurter.app/latest"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params={"from": frm, "to": to, "amount": amount})
        resp.raise_for_status()
        data: dict[str, Any] = resp.json()
        rates: dict[str, float] = data["rates"]
        return rates[to]
