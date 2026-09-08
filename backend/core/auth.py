from __future__ import annotations

import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import Header, HTTPException

from core.db import get_user_by_id

JWT_ALGORITHM = "HS256"
JWT_EXPIRES_DAYS = 7
_PBKDF2_ITERATIONS = 260_000


def _secret_key() -> str:
    key = os.environ.get("JWT_SECRET_KEY")
    if not key:
        raise RuntimeError("JWT_SECRET_KEY is not set in the environment")
    return key


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS
    )
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_hex, digest_hex = password_hash.split("$")
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    expected = bytes.fromhex(digest_hex)
    actual = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS
    )
    return hmac.compare_digest(actual, expected)


def create_access_token(user_id: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(days=JWT_EXPIRES_DAYS),
    }
    return jwt.encode(payload, _secret_key(), algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload: dict[str, Any] = jwt.decode(
            token, _secret_key(), algorithms=[JWT_ALGORITHM]
        )
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None


async def resolve_user_id(token: str | None) -> str | None:
    if not token:
        return None
    user_id = decode_access_token(token)
    if user_id is None:
        return None
    user = await get_user_by_id(user_id)
    return user_id if user else None


async def get_current_user_id(
    authorization: str | None = Header(default=None),
) -> str:
    user_id = await get_current_user_id_optional(authorization)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


async def get_current_user_id_optional(
    authorization: str | None = Header(default=None),
) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return await resolve_user_id(authorization.removeprefix("Bearer ").strip())
