from __future__ import annotations

import asyncio
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent.parent / "TripAssist.db"

_lock = asyncio.Lock()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _init_sync() -> None:
    conn = _connect()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS trips (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                job_id TEXT NOT NULL,
                destination TEXT NOT NULL,
                origin TEXT NOT NULL,
                departure_date TEXT NOT NULL,
                return_date TEXT NOT NULL,
                travelers INTEGER NOT NULL,
                currency TEXT NOT NULL,
                total_estimated_cost_text TEXT NOT NULL,
                total_estimated_cost_amount REAL,
                result_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        try:
            # Migrate DBs created before result_json existed - the job store
            # that used to be the only home for the full TripResult is
            # in-memory and does not survive a backend restart.
            conn.execute("ALTER TABLE trips ADD COLUMN result_json TEXT")
        except sqlite3.OperationalError:
            pass
        conn.commit()
    finally:
        conn.close()


async def init_db() -> None:
    async with _lock:
        await asyncio.to_thread(_init_sync)


def _create_user_sync(email: str, name: str, password_hash: str) -> dict[str, Any]:
    conn = _connect()
    try:
        user_id = str(uuid.uuid4())
        created_at = datetime.now(UTC).isoformat()
        conn.execute(
            "INSERT INTO users (id, email, name, password_hash, created_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (user_id, email, name, password_hash, created_at),
        )
        conn.commit()
        return {
            "id": user_id,
            "email": email,
            "name": name,
            "password_hash": password_hash,
            "created_at": created_at,
        }
    finally:
        conn.close()


async def create_user(email: str, name: str, password_hash: str) -> dict[str, Any]:
    return await asyncio.to_thread(_create_user_sync, email, name, password_hash)


def _get_user_by_email_sync(email: str) -> dict[str, Any] | None:
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


async def get_user_by_email(email: str) -> dict[str, Any] | None:
    return await asyncio.to_thread(_get_user_by_email_sync, email)


def _get_user_by_id_sync(user_id: str) -> dict[str, Any] | None:
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


async def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    return await asyncio.to_thread(_get_user_by_id_sync, user_id)


def _create_trip_sync(
    user_id: str,
    job_id: str,
    destination: str,
    origin: str,
    departure_date: str,
    return_date: str,
    travelers: int,
    currency: str,
    total_estimated_cost_text: str,
    total_estimated_cost_amount: float | None,
    result_json: str,
) -> None:
    conn = _connect()
    try:
        conn.execute(
            """
            INSERT INTO trips (
                id, user_id, job_id, destination, origin, departure_date,
                return_date, travelers, currency, total_estimated_cost_text,
                total_estimated_cost_amount, result_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                user_id,
                job_id,
                destination,
                origin,
                departure_date,
                return_date,
                travelers,
                currency,
                total_estimated_cost_text,
                total_estimated_cost_amount,
                result_json,
                datetime.now(UTC).isoformat(),
            ),
        )
        conn.commit()
    finally:
        conn.close()


async def create_trip(
    user_id: str,
    job_id: str,
    destination: str,
    origin: str,
    departure_date: str,
    return_date: str,
    travelers: int,
    currency: str,
    total_estimated_cost_text: str,
    total_estimated_cost_amount: float | None,
    result_json: str,
) -> None:
    await asyncio.to_thread(
        _create_trip_sync,
        user_id,
        job_id,
        destination,
        origin,
        departure_date,
        return_date,
        travelers,
        currency,
        total_estimated_cost_text,
        total_estimated_cost_amount,
        result_json,
    )


def _get_trip_by_job_id_sync(user_id: str, job_id: str) -> dict[str, Any] | None:
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT * FROM trips WHERE user_id = ? AND job_id = ?",
            (user_id, job_id),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


async def get_trip_by_job_id(user_id: str, job_id: str) -> dict[str, Any] | None:
    return await asyncio.to_thread(_get_trip_by_job_id_sync, user_id, job_id)


def _list_trips_sync(user_id: str) -> list[dict[str, Any]]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


async def list_trips(user_id: str) -> list[dict[str, Any]]:
    return await asyncio.to_thread(_list_trips_sync, user_id)


def _get_stats_sync(user_id: str) -> dict[str, Any]:
    conn = _connect()
    try:
        total_trips = conn.execute(
            "SELECT COUNT(*) AS c FROM trips WHERE user_id = ?", (user_id,)
        ).fetchone()["c"]
        by_currency = conn.execute(
            """
            SELECT currency, SUM(total_estimated_cost_amount) AS total,
                   COUNT(*) AS trip_count
            FROM trips
            WHERE user_id = ? AND total_estimated_cost_amount IS NOT NULL
            GROUP BY currency
            """,
            (user_id,),
        ).fetchall()
        return {
            "total_trips": total_trips,
            "spend_by_currency": [dict(r) for r in by_currency],
        }
    finally:
        conn.close()


async def get_stats(user_id: str) -> dict[str, Any]:
    return await asyncio.to_thread(_get_stats_sync, user_id)
