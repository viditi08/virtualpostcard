import uuid
import secrets
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

Orientation = Literal["landscape", "portrait"]
CardSize = Literal["standard", "large", "square"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PostcardIn(BaseModel):
    title: str = Field(default="Untitled postcard", max_length=120)
    front_image_url: str = Field(min_length=1)
    orientation: Orientation = "landscape"
    size: CardSize = "standard"
    message: str = Field(default="", max_length=1200)
    recipient_name: str = Field(default="", max_length=80)
    sender_name: str = Field(default="", max_length=80)
    stamp_id: str = "vintage_airmail"
    seal_color: str = "#B83A28"
    is_draft: bool = True


class OpenEvent(BaseModel):
    at: datetime
    device: str = ""


class Postcard(PostcardIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    share_id: str = Field(default_factory=lambda: secrets.token_urlsafe(9))
    owner_id: str
    date_str: str
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)
    opened_count: int = 0
    last_opened_at: Optional[datetime] = None
    opens: List[OpenEvent] = []


class PublicPostcard(BaseModel):
    """What a recipient sees — no owner id, no tracking data."""
    share_id: str
    title: str
    front_image_url: str
    orientation: Orientation
    size: CardSize
    message: str
    recipient_name: str
    sender_name: str
    stamp_id: str
    seal_color: str
    date_str: str


class Design(BaseModel):
    id: str
    title: str
    url: str
    orientation: Orientation


class UploadOut(BaseModel):
    url: str


class Profile(BaseModel):
    user_id: str
    email: str = ""
    name: str = ""
    image_url: str = ""
    postcards_count: int = 0
    created_at: datetime


class TodayOut(BaseModel):
    date: str
