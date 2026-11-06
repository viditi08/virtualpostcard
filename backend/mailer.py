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

import os
import re
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage

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


def postcard_message(link: str, recipient_name: str, sender_name: str) -> tuple[str, str]:
    cleaned_link = link.strip()
    if any(char in cleaned_link for char in "\r\n") or not cleaned_link.startswith(("http://", "https://")):
        raise MailError("The postcard link is not a web address.", 422)
    if len(cleaned_link) > 500:
        raise MailError("The postcard link is too long.", 422)
    who = _clean_line(recipient_name, 80)
    sender = _clean_line(sender_name, 80)
    greeting = f"A little postcard for you, {who}." if who else "A little postcard for you."
    signoff = f"\n\n— {sender}" if sender else ""
    subject = "You've got mail"
    body = f"{greeting}\n\nOpen the envelope here:\n{cleaned_link}{signoff}\n"
    return subject, body


def send_postcard_email(to: str, link: str, recipient_name: str = "", sender_name: str = "") -> str:
    recipient = normalize_recipient(to)
    subject, body = postcard_message(link, recipient_name, sender_name)
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
    message["From"] = settings.from_addr
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
