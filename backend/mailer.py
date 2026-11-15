"""Send a sealed postcard through SMTP.

Both servers read the same file, backend/.env:

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=you@gmail.com
    SMTP_PASSWORD=your-app-password
    SMTP_FROM=you@gmail.com
    SMTP_STARTTLS=1

Gmail will not accept your normal account password. Turn on 2-Step
Verification, then create an App Password under Google Account, Security,
App passwords, and put that 16-character value in SMTP_PASSWORD.
"""

from __future__ import annotations

import base64
import json
import os
import re
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr
from urllib.parse import urlparse

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class MailError(Exception):
    def __init__(self, message: str, status: int = 502) -> None:
        super().__init__(message)
        self.status = status


@dataclass(frozen=True)
class SmtpSettings:
    host: str
    port: int
    user: str
    password: str
    from_addr: str
    starttls: bool

    @property
    def missing(self) -> list[str]:
        blank = []
        if not self.host:
            blank.append("SMTP_HOST")
        if not self.user:
            blank.append("SMTP_USER")
        if not self.password:
            blank.append("SMTP_PASSWORD")
        if not self.from_addr:
            blank.append("SMTP_FROM")
        return blank

    @property
    def ready(self) -> bool:
        return not self.missing


def smtp_settings() -> SmtpSettings:
    port_raw = os.environ.get("SMTP_PORT", "587").strip() or "587"
    try:
        port = int(port_raw)
    except ValueError as exc:
        raise MailError("SMTP_PORT in backend/.env must be a number, usually 587.") from exc
    user = os.environ.get("SMTP_USER", "").strip()
    starttls_raw = os.environ.get("SMTP_STARTTLS", "1").strip().lower()
    return SmtpSettings(
        host=os.environ.get("SMTP_HOST", "").strip(),
        port=port,
        user=user,
        password=os.environ.get("SMTP_PASSWORD", "").replace(" ", ""),
        from_addr=os.environ.get("SMTP_FROM", "").strip() or user,
        starttls=starttls_raw not in {"0", "false", "no", "off"},
    )


def normalize_recipient(address: str) -> str:
    cleaned = address.strip()
    if any(char in cleaned for char in "\r\n"):
        raise MailError("Enter a single email address.", 422)
    if not EMAIL_RE.fullmatch(cleaned):
        raise MailError("Enter a full email address, like alex@example.com.", 422)
    return cleaned


def _clean_line(value: str, limit: int) -> str:
    return " ".join(value.replace("\r", " ").replace("\n", " ").split())[:limit]


def _is_public_http_url(url: str) -> bool:
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return False
    host = parsed.hostname.lower().rstrip(".")
    if host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"} or host.endswith(".local"):
        return False
    parts = host.split(".")
    if len(parts) == 4 and all(part.isdigit() for part in parts):
        first = int(parts[0])
        second = int(parts[1])
        if first in {10, 127} or (first == 192 and second == 168) or (first == 172 and 16 <= second <= 31):
            return False
    return True


def pack_card(card: dict) -> str:
    """The postcard itself, packed into a link so a stranger's browser can open it."""
    image = str(card.get("front_image_url") or "")
    if not (image.startswith("/designs/") or image == "/hero-image.jpeg"):
        image = ""
    orientation = card.get("orientation") if card.get("orientation") in {"landscape", "portrait"} else "landscape"
    size = card.get("size") if card.get("size") in {"standard", "large", "square"} else "standard"
    seal = str(card.get("seal_color") or "")
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", seal):
        seal = "#B83A28"
    payload = {
        "title": str(card.get("title") or "")[:120],
        "front_image_url": image,
        "orientation": orientation,
        "size": size,
        "message": str(card.get("message") or "")[:600],
        "recipient_name": str(card.get("recipient_name") or "")[:80],
        "sender_name": str(card.get("sender_name") or "")[:80],
        "stamp_id": str(card.get("stamp_id") or "vintage_airmail")[:40],
        "seal_color": seal,
        "date_str": str(card.get("date_str") or "")[:20],
    }
    raw = json.dumps(payload, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def unpack_card(token: str) -> dict | None:
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,8000}", token or ""):
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(token + "=" * (-len(token) % 4)))
    except (json.JSONDecodeError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    normalized = pack_card(data)
    return json.loads(base64.urlsafe_b64decode(normalized + "=" * (-len(normalized) % 4)))


def public_base_url() -> str:
    """The address strangers can open. Render fills this in when you deploy there."""
    for key in ("PUBLIC_BASE_URL", "RENDER_EXTERNAL_URL"):
        value = os.environ.get(key, "").strip().rstrip("/")
        if _is_public_http_url(value):
            return value
    return ""


def anyone_url(card: dict) -> str:
    """A link on the public site. Empty while the studio only has a localhost address.

    A sealed card uses /p/<share id>, which is the page a stranger can open.
    A card with no share id falls back to the packed #card= link.
    """
    base = public_base_url()
    if not base:
        return ""
    share_id = str(card.get("share_id") or "")
    if re.fullmatch(r"[A-Za-z0-9_-]{4,80}", share_id):
        return f"{base}/p/{share_id}"
    return f"{base}/#card={pack_card(card)}"


def public_postcard_url(link: str, share_id: str = "") -> str:
    """A link the recipient can open. A localhost address is left out."""
    del share_id
    candidate = link.strip()
    if candidate and not any(char in candidate for char in "\r\n") and len(candidate) <= 8000 and _is_public_http_url(candidate):
        return candidate
    return ""


def postcard_message(link: str, recipient_name: str, sender_name: str, note: str = "", share_id: str = "") -> tuple[str, str]:
    who = _clean_line(recipient_name, 80)
    sender = _clean_line(sender_name, 80)
    written = note.replace("\r", "").strip()[:600]
    greeting = f"A little postcard for you, {who}." if who else "A little postcard for you."
    parts = [greeting]
    if written:
        parts.append(written)
    public = public_postcard_url(link, share_id)
    if public:
        parts.append(f"Open the envelope here:\n{public}")
    if sender:
        parts.append(f"\u2014 {sender}")
    return "You've got mail", "\n\n".join(parts) + "\n"


def from_header(settings: SmtpSettings) -> str:
    name = _clean_line(os.environ.get("SMTP_FROM_NAME", "Postcard Delivery"), 80) or "Postcard Delivery"
    return formataddr((name, settings.from_addr))


def send_postcard_email(
    to: str,
    link: str,
    recipient_name: str = "",
    sender_name: str = "",
    note: str = "",
    share_id: str = "",
) -> str:
    recipient = normalize_recipient(to)
    subject, body = postcard_message(link, recipient_name, sender_name, note, share_id)
    settings = smtp_settings()
    if not settings.ready:
        names = ", ".join(settings.missing)
        raise MailError(
            "SMTP is not set up. Open backend/.env and set "
            f"{names}. For Gmail use SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, "
            "your Gmail address for SMTP_USER and SMTP_FROM, and a Google App Password "
            "for SMTP_PASSWORD. Restart the server after you save the file.",
            503,
        )
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = from_header(settings)
    message["To"] = recipient
    message.set_content(body)
    try:
        if settings.port == 465 or not settings.starttls:
            with smtplib.SMTP_SSL(settings.host, settings.port, timeout=20, context=ssl.create_default_context()) as smtp:
                smtp.login(settings.user, settings.password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(settings.host, settings.port, timeout=20) as smtp:
                smtp.ehlo()
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
                smtp.login(settings.user, settings.password)
                smtp.send_message(message)
    except smtplib.SMTPAuthenticationError as exc:
        hint = (
            " For Gmail, SMTP_PASSWORD must be an App Password, not the password you type to sign in."
            if "gmail" in settings.host.lower()
            else ""
        )
        raise MailError(
            "The mail server rejected the login. Check SMTP_USER and SMTP_PASSWORD in backend/.env." + hint
        ) from exc
    except (OSError, smtplib.SMTPException) as exc:
        raise MailError(
            "The mail server could not send the postcard. Check SMTP_HOST and SMTP_PORT in backend/.env."
        ) from exc
    return recipient
