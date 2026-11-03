"""Desk accounts used only when Clerk keys are absent.

Whimsy Post normally signs people in with Clerk. This module keeps the same
postcard API working on a laptop that has no Clerk app: email and password
live in Mongo, and the session is a short-lived HS256 token. Setting both
CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY turns these routes off.
"""

import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from lib.db import db

local_router = APIRouter()

_SECRET_FILE = Path(__file__).parent / ".local_secret"


def clerk_enabled() -> bool:
    return bool(os.environ.get("CLERK_PUBLISHABLE_KEY") and os.environ.get("CLERK_SECRET_KEY"))


def local_secret() -> str:
    configured = os.environ.get("LOCAL_AUTH_SECRET", "").strip()
    if configured:
        return configured
    if _SECRET_FILE.exists():
        saved = _SECRET_FILE.read_text().strip()
        if saved:
            return saved
    generated = secrets.token_urlsafe(32)
    _SECRET_FILE.write_text(generated)
    return generated


def _require_local_mode() -> None:
    if clerk_enabled():
        raise HTTPException(status_code=404, detail="Not found")


def issue_token(user_id: str, email: str, name: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": user_id,
            "email": email,
            "name": name,
            "iat": now,
            "exp": now + timedelta(days=14),
        },
        local_secret(),
        algorithm="HS256",
    )


def verify_local_token(token: str) -> dict:
    try:
        claims = jwt.decode(token, local_secret(), algorithms=["HS256"], leeway=5)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return {"user_id": claims["sub"], "session_id": None, "claims": claims}


class SignupIn(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=8, max_length=200)
    name: str = Field(default="", max_length=80)


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=200)


class LocalUserOut(BaseModel):
    user_id: str
    email: str
    name: str


class AuthOut(BaseModel):
    token: str
    user: LocalUserOut


def _normalize_email(email: str) -> str:
    cleaned = email.strip().lower()
    if "@" not in cleaned or cleaned.startswith("@") or cleaned.endswith("@"):
        raise HTTPException(status_code=422, detail="Enter a valid email address")
    return cleaned


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000)
    return f"pbkdf2_sha256$200000${salt}${digest.hex()}"


def _check_password(password: str, hashed: str) -> bool:
    try:
        _algo, rounds, salt, hexdigest = hashed.split("$", 3)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds))
        return hmac.compare_digest(digest.hex(), hexdigest)
    except (ValueError, TypeError):
        return False


async def _upsert_profile(user_id: str, email: str, name: str) -> None:
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {"email": email, "name": name, "image_url": ""},
            "$setOnInsert": {"user_id": user_id, "created_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )


@local_router.post("/auth/signup", response_model=AuthOut)
async def signup(body: SignupIn):
    _require_local_mode()
    email = _normalize_email(body.email)
    name = body.name.strip() or email.split("@", 1)[0]
    user_id = str(uuid.uuid4())
    try:
        await db.local_users.insert_one(
            {
                "user_id": user_id,
                "email": email,
                "name": name,
                "password_hash": _hash_password(body.password),
                "created_at": datetime.now(timezone.utc),
            }
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with that email already exists")
    await _upsert_profile(user_id, email, name)
    user = LocalUserOut(user_id=user_id, email=email, name=name)
    return AuthOut(token=issue_token(user_id, email, name), user=user)


@local_router.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn):
    _require_local_mode()
    email = _normalize_email(body.email)
    doc = await db.local_users.find_one({"email": email})
    if not doc or not _check_password(body.password, doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    await _upsert_profile(doc["user_id"], doc["email"], doc.get("name", ""))
    user = LocalUserOut(user_id=doc["user_id"], email=doc["email"], name=doc.get("name", ""))
    return AuthOut(token=issue_token(user.user_id, user.email, user.name), user=user)
