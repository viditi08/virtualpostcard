import os
import uuid
from datetime import datetime, timezone
from typing import List

import requests
from bson.binary import Binary
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from starlette.concurrency import run_in_threadpool

from clerk_auth import require_user
from lib.dates import today_iso
from lib.db import db
from mailer import MailError, send_postcard_email
from models.postcard import (
    Design, Postcard, PostcardEmailIn, PostcardEmailOut, PostcardIn, Profile, PublicPostcard, TodayOut, UploadOut,
)

router = APIRouter()

DESIGNS: List[Design] = [
    Design(id="balloons", title="Balloons over the valley", orientation="landscape",
        url="/designs/balloons.jpeg"),
    Design(id="lighthouse", title="Seaside lighthouse", orientation="landscape",
        url="/designs/lighthouse.jpeg"),
    Design(id="fox", title="Fox & the letter", orientation="portrait",
        url="/designs/fox.jpeg"),
    Design(id="cake", title="Birthday cake", orientation="portrait",
        url="/designs/cake.jpeg"),
    Design(id="moon", title="Moonlit cottage", orientation="landscape",
        url="/designs/moon.jpeg"),
    Design(id="bicycle", title="Café bicycle", orientation="landscape",
        url="/designs/bicycle.jpeg"),
]

MAX_UPLOAD = 8 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _aware(dt):
    return dt.replace(tzinfo=timezone.utc) if dt and dt.tzinfo is None else dt


def _to_postcard(doc: dict) -> Postcard:
    doc = {k: v for k, v in doc.items() if k != "_id"}
    for f in ("created_at", "updated_at", "last_opened_at"):
        doc[f] = _aware(doc.get(f))
    doc["opens"] = [{**o, "at": _aware(o["at"])} for o in doc.get("opens", [])]
    return Postcard(**doc)


def _fetch_clerk_profile(user_id: str) -> dict:
    r = requests.get(
        f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
        headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "postcard-studio"},
    )
    r.raise_for_status()
    u = r.json()
    emails = u.get("email_addresses") or []
    primary = next((e for e in emails if e.get("id") == u.get("primary_email_address_id")), emails[0] if emails else {})
    name = " ".join(x for x in [u.get("first_name"), u.get("last_name")] if x)
    return {"email": primary.get("email_address", ""), "name": name, "image_url": u.get("image_url", "")}


@router.get("/today", response_model=TodayOut)
async def today():
    return TodayOut(date=today_iso())


@router.get("/designs", response_model=List[Design])
async def list_designs():
    return DESIGNS


@router.get("/me", response_model=Profile)
async def me(user: dict = Depends(require_user)):
    """Stores the sender's profile in our own DB on first visit (refreshed when empty)."""
    uid = user["user_id"]
    doc = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if doc is None or not doc.get("email"):
        try:
            info = await run_in_threadpool(_fetch_clerk_profile, uid)
        except Exception:
            info = {}
        await db.users.update_one(
            {"user_id": uid},
            {"$set": info, "$setOnInsert": {"user_id": uid, "created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        doc = await db.users.find_one({"user_id": uid}, {"_id": 0})
    count = await db.postcards.count_documents({"owner_id": uid})
    return Profile(**{**doc, "created_at": _aware(doc["created_at"]), "postcards_count": count})


@router.get("/postcards", response_model=List[Postcard])
async def list_postcards(user: dict = Depends(require_user)):
    docs = await db.postcards.find({"owner_id": user["user_id"]}).sort("updated_at", -1).to_list(500)
    return [_to_postcard(d) for d in docs]


@router.post("/postcards", response_model=Postcard)
async def create_postcard(body: PostcardIn, user: dict = Depends(require_user)):
    card = Postcard(**body.model_dump(), owner_id=user["user_id"], date_str=today_iso())
    await db.postcards.insert_one(card.model_dump())
    return card


@router.get("/postcards/{id}", response_model=Postcard)
async def get_postcard(id: str, user: dict = Depends(require_user)):
    doc = await db.postcards.find_one({"id": id, "owner_id": user["user_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Postcard not found")
    return _to_postcard(doc)


@router.put("/postcards/{id}", response_model=Postcard)
async def update_postcard(id: str, body: PostcardIn, user: dict = Depends(require_user)):
    res = await db.postcards.find_one_and_update(
        {"id": id, "owner_id": user["user_id"]},
        {"$set": {**body.model_dump(), "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Postcard not found")
    return _to_postcard(res)


@router.post("/postcards/{id}/email", response_model=PostcardEmailOut)
async def email_postcard(id: str, body: PostcardEmailIn, request: Request, user: dict = Depends(require_user)):
    doc = await db.postcards.find_one({"id": id, "owner_id": user["user_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Postcard not found")
    if doc.get("is_draft"):
        raise HTTPException(status_code=409, detail="Seal the postcard before emailing it.")
    link = body.link.strip() or _public_link(request, doc["share_id"])
    try:
        sent_to = await run_in_threadpool(
            send_postcard_email, body.to, link, doc.get("recipient_name") or "", doc.get("sender_name") or "",
        )
    except MailError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc
    return PostcardEmailOut(sent=True, to=sent_to)


def _public_link(request: Request, share_id: str) -> str:
    configured = os.environ.get("PUBLIC_BASE_URL", "").strip().rstrip("/")
    if configured:
        return f"{configured}/p/{share_id}"
    return str(request.base_url).rstrip("/") + f"/p/{share_id}"


@router.delete("/postcards/{id}", status_code=204)
async def delete_postcard(id: str, user: dict = Depends(require_user)):
    res = await db.postcards.delete_one({"id": id, "owner_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Postcard not found")
    return Response(status_code=204)


@router.get("/public/postcards/{share_id}", response_model=PublicPostcard)
async def public_postcard(share_id: str):
    doc = await db.postcards.find_one({"share_id": share_id, "is_draft": False})
    if not doc:
        raise HTTPException(status_code=404, detail="This postcard could not be found")
    return PublicPostcard(**doc)


@router.post("/public/postcards/{share_id}/open", status_code=204)
async def record_open(share_id: str, request: Request):
    now = datetime.now(timezone.utc)
    device = request.headers.get("user-agent", "")[:160]
    res = await db.postcards.update_one(
        {"share_id": share_id, "is_draft": False},
        {"$inc": {"opened_count": 1}, "$set": {"last_opened_at": now},
         "$push": {"opens": {"$each": [{"at": now, "device": device}], "$slice": -50}}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="This postcard could not be found")
    return Response(status_code=204)


@router.post("/uploads", response_model=UploadOut)
async def upload_image(file: UploadFile = File(...), user: dict = Depends(require_user)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, WEBP or GIF image")
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="Image must be 8 MB or smaller")
    uid = str(uuid.uuid4())
    await db.uploads.insert_one({
        "id": uid, "owner_id": user["user_id"], "content_type": file.content_type,
        "data": Binary(data), "created_at": datetime.now(timezone.utc),
    })
    return UploadOut(url=f"/api/uploads/{uid}")


@router.get("/uploads/{id}")
async def get_upload(id: str):
    doc = await db.uploads.find_one({"id": id})
    if not doc:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=bytes(doc["data"]), media_type=doc["content_type"],
                    headers={"Cache-Control": "public, max-age=31536000, immutable"})
