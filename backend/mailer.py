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
import html
import json
import os
import re
import smtplib
import ssl
import urllib.error
import urllib.request
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
    """A link the recipient can open. A localhost address is replaced with the public site."""
    candidate = (link or "").strip()
    if candidate and not any(char in candidate for char in "\r\n") and len(candidate) <= 8000 and _is_public_http_url(candidate):
        return candidate
    base = public_base_url() or "https://virtualpostcard.onrender.com"
    if re.fullmatch(r"[A-Za-z0-9_-]{4,80}", share_id or ""):
        return f"{base}/p/{share_id}"
    return ""


def postcard_subject(recipient_name: str, sender_name: str) -> str:
    who = _clean_line(recipient_name, 80)
    sender = _clean_line(sender_name, 80)
    if sender and who:
        subject = f"{sender} sealed an envelope for {who}"
    elif sender:
        subject = f"{sender} sealed an envelope for you"
    elif who:
        subject = f"A sealed envelope for {who}"
    else:
        subject = "A sealed envelope for you"
    return _clean_line(subject, 120)


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
        parts.append(f"Open your postcard:\n{public}")
    if sender:
        parts.append(f"— {sender}")
    return postcard_subject(recipient_name, sender_name), "\n\n".join(parts) + "\n"


def envelope_image_url(link: str) -> str:
    """The sealed-envelope picture, hosted on the public site."""
    base = public_base_url()
    if not base:
        public = public_postcard_url(link)
        if public:
            parsed = urlparse(public)
            base = f"{parsed.scheme}://{parsed.netloc}"
    if not base:
        base = "https://virtualpostcard.onrender.com"
    return f"{base}/sealed-envelope.jpg"


def postcard_html(link: str, recipient_name: str, sender_name: str, note: str = "", share_id: str = "") -> str:
    """A short letter with the sealed envelope in the middle."""
    who = html.escape(_clean_line(recipient_name, 80))
    sender = html.escape(_clean_line(sender_name, 80))
    written = html.escape(note.replace("\r", "").strip()[:600]).replace("\n", "<br>")
    public = public_postcard_url(link, share_id)
    image = envelope_image_url(public or link)
    greeting = f"A little postcard for you, {who}." if who else "A little postcard for you."
    picture = ""
    if image:
        src = html.escape(image, quote=True)
        inner = (
            f'<img src="{src}" alt="A sealed envelope" width="480" '
            'style="display:block;width:100%;max-width:480px;height:auto;border:0;border-radius:8px;">'
        )
        if public:
            href = html.escape(public, quote=True)
            inner = f'<a href="{href}" style="text-decoration:none;">{inner}</a>'
        picture = (
            '<tr><td align="center" style="padding:8px 32px 20px;">'
            f"{inner}</td></tr>"
        )
    button = ""
    if public:
        href = html.escape(public, quote=True)
        shown = html.escape(public)
        button = (
            '<tr><td align="center" style="padding:4px 32px 8px;">'
            f'<a href="{href}" style="display:inline-block;background:#A34832;color:#FFFDF8;'
            'font-family:Georgia,serif;font-size:16px;text-decoration:none;padding:12px 22px;border-radius:999px;">'
            "Open the envelope</a></td></tr>"
            '<tr><td align="center" style="padding:0 32px 28px;font-family:Georgia,serif;font-size:14px;line-height:1.5;">'
            f'<a href="{href}" style="color:#A34832;text-decoration:underline;">Open your postcard</a>'
            f'<br><a href="{href}" style="color:#8A7568;font-size:13px;word-break:break-all;">{shown}</a>'
            "</td></tr>"
        )
    note_row = ""
    if written:
        note_row = (
            '<tr><td style="padding:0 32px 18px;font-family:Georgia,serif;font-size:17px;'
            f'line-height:1.5;color:#2C1810;">{written}</td></tr>'
        )
    signoff = ""
    if sender:
        signoff = (
            '<tr><td style="padding:0 32px 28px;font-family:Georgia,serif;font-size:16px;'
            f'font-style:italic;color:#2C1810;">— {sender}</td></tr>'
        )
    return f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F3EBE0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EBE0;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDF8;border-radius:16px;">
<tr><td style="padding:28px 32px 8px;font-family:Georgia,serif;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#A34832;">Special delivery</td></tr>
<tr><td style="padding:0 32px 16px;font-family:Georgia,serif;font-size:28px;line-height:1.25;color:#2C1810;">{greeting}</td></tr>
{note_row}
{picture}
{button}
{signoff}
<tr><td style="padding:0 32px 24px;font-family:Georgia,serif;font-size:12px;color:#8A7568;">Postcard Delivery</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
"""


def from_header(settings: SmtpSettings) -> str:
    name = _clean_line(os.environ.get("SMTP_FROM_NAME", "Postcard Delivery"), 80) or "Postcard Delivery"
    return formataddr((name, settings.from_addr))


def sender_address() -> str:
    return (
        os.environ.get("SMTP_FROM", "").strip()
        or os.environ.get("MAIL_FROM", "").strip()
        or os.environ.get("SMTP_USER", "").strip()
    )


def clean_secret(value: str) -> str:
    text = value.strip().strip('"').strip("'").strip()
    lowered = text.lower()
    for prefix in ("api-key:", "bearer "):
        if lowered.startswith(prefix):
            text = text[len(prefix):].strip().strip('"').strip("'")
            break
    return "".join(text.split())


def mail_credentials() -> tuple[str, str]:
    """Which HTTPS mail service to call, and the key to send.

    Brevo sends the postcard whenever BREVO_API_KEY starts with xkeysib-,
    even when a Resend key is also set. Resend is only the fallback.
    Brevo's SMTP key starts with xsmtpsib- and is refused by the API.
    """
    brevo = clean_secret(os.environ.get("BREVO_API_KEY", ""))
    resend = clean_secret(os.environ.get("RESEND_API_KEY", ""))
    if resend.startswith("xkeysib-") and not brevo.startswith("xkeysib-"):
        brevo = resend
        resend = ""
    if brevo.startswith("re_") and not resend.startswith("re_"):
        resend = brevo
        brevo = ""
    if brevo.startswith("xsmtpsib-") or resend.startswith("xsmtpsib-"):
        raise MailError(
            "That is a Brevo SMTP key, and the API will not accept it. In Brevo open "
            "SMTP & API, then API keys, generate a key that starts with xkeysib-, and "
            "put only that value in BREVO_API_KEY on Render.",
            503,
        )
    if brevo.startswith("xkeysib-"):
        return "brevo", brevo
    if brevo:
        raise MailError(
            "BREVO_API_KEY is not a Brevo API key. It has to start with xkeysib-. "
            "In Brevo open SMTP & API, choose API keys, generate a key, and paste only "
            "that value on Render, with no quotes.",
            503,
        )
    if resend.startswith("re_"):
        return "resend", resend
    if resend:
        raise MailError(
            "RESEND_API_KEY is not a Resend key. It has to start with re_. "
            "Create one at resend.com/api-keys and paste only that value on Render.",
            503,
        )
    return "", ""


def _https_failure(provider: str, status: int, detail: str) -> str:
    lowered = detail.lower()
    if provider == "resend" and (
        "own email" in lowered or "verify a domain" in lowered or "not verified" in lowered or "sender" in lowered
    ):
        return (
            "Resend will only send from a verified domain. Add the domain at resend.com/domains, "
            "then set SMTP_FROM to an address on it, such as hello@yourdomain.com. "
            "onboarding@resend.dev can send only to the email you used to sign up for Resend."
        )
    if status in {401, 403}:
        if provider == "brevo":
            if "ip" in lowered or "unauthor" in lowered:
                return (
                    "Brevo blocked this server's address. Open Settings, then Security, "
                    "then Authorized IPs, and choose Deactivate for API."
                )
            return (
                "Brevo refused this API key. Open SMTP & API, then API keys, generate a new key "
                "that starts with xkeysib-, and replace BREVO_API_KEY on Render."
            )
        return (
            "Resend refused this API key. Create a new key at resend.com/api-keys "
            "and replace RESEND_API_KEY on Render."
        )
    if status == 400 and ("not verified" in lowered or "sender" in lowered):
        return "The sender address is not verified yet. Confirm SMTP_FROM in Resend, then try again."
    return "The mail service could not send the postcard. Check the API key and SMTP_FROM on the Render Environment page."


def _post_json(provider: str, url: str, headers: dict[str, str], payload: dict) -> None:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise MailError(_https_failure(provider, exc.code, detail)) from exc
    except urllib.error.URLError as exc:
        raise MailError("The mail service could not be reached. Try again in a moment.") from exc


def send_https_email(provider: str, key: str, to: str, subject: str, body: str, html_body: str = "") -> None:
    address = sender_address()
    if not address:
        raise MailError("Set SMTP_FROM to the address the postcard should come from.", 503)
    name = _clean_line(os.environ.get("SMTP_FROM_NAME", "Postcard Delivery"), 80) or "Postcard Delivery"
    if provider == "brevo":
        payload = {
            "sender": {"name": name, "email": address},
            "to": [{"email": to}],
            "subject": subject,
            "textContent": body,
        }
        if html_body:
            payload["htmlContent"] = html_body
            # Brevo cannot place this picture inside the letter with a cid: link.
            # The same photo is attached so it still shows when a mailbox hides remote pictures.
            from envelope_image import jpeg_bytes
            payload["attachment"] = [{
                "name": "sealed-envelope.jpg",
                "content": base64.b64encode(jpeg_bytes()).decode("ascii"),
            }]
        _post_json(provider, "https://api.brevo.com/v3/smtp/email", {"api-key": key}, payload)
        return
    _post_json(
        provider,
        "https://api.resend.com/emails",
        {"Authorization": f"Bearer {key}"},
        {
            "from": formataddr((name, address)),
            "to": [to],
            "subject": subject,
            "text": body,
            **({"html": html_body} if html_body else {}),
        },
    )


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
    html_body = postcard_html(link, recipient_name, sender_name, note, share_id)
    provider, key = mail_credentials()
    if provider:
        send_https_email(provider, key, recipient, subject, body, html_body)
        return recipient
    settings = smtp_settings()
    if os.environ.get("RENDER", "").lower() == "true" and settings.port in {25, 465, 587}:
        raise MailError(
            "Render's free plan blocks Gmail's mail ports. Add BREVO_API_KEY "
            "on the Render Environment page. The key starts with xkeysib-. "
            "Set SMTP_FROM to the address the postcard should come from.",
            503,
        )
    if not settings.ready:
        names = ", ".join(settings.missing)
        raise MailError(
            "SMTP is not set up. Open backend/.env and set "
            f"{names}. For Gmail use SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, "
            "your Gmail address for SMTP_USER and SMTP_FROM, and a Google App Password "
            "for SMTP_PASSWORD. On Render's free plan, set BREVO_API_KEY instead.",
            503,
        )
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = from_header(settings)
    message["To"] = recipient
    message.set_content(body)
    message.add_alternative(html_body, subtype="html")
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
