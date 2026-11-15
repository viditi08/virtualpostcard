#!/usr/bin/env python3
"""Whimsy Post, runnable with the Python standard library.

The React + FastAPI app in frontend/ and backend/ is the full studio. This
preview serves the same flows — design a card, seal it, open the envelope —
without MongoDB, Node, or Clerk, which this environment cannot download.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import sys
import threading
import uuid
from datetime import datetime, timezone
from email.parser import BytesParser
from email.policy import default as email_default
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from mailer import MailError, anyone_url, send_postcard_email  # noqa: E402

PUBLIC = ROOT / "frontend" / "public"
DATA = Path(os.environ.get("WHIMSY_DATA", "/tmp/whimsy-post"))
INDEX = Path(__file__).resolve().parent / "index.html"
HOST = os.environ.get("WHIMSY_HOST", "0.0.0.0")
# Render assigns PORT. WHIMSY_PORT is the local preview port.
PORT = int(os.environ.get("PORT") or os.environ.get("WHIMSY_PORT") or "43123")
MAX_UPLOAD = 8 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

DESIGNS = [
    {"id": "balloons", "title": "Balloons over the valley", "orientation": "landscape", "url": "/designs/balloons.jpeg"},
    {"id": "lighthouse", "title": "Seaside lighthouse", "orientation": "landscape", "url": "/designs/lighthouse.jpeg"},
    {"id": "fox", "title": "Fox & the letter", "orientation": "portrait", "url": "/designs/fox.jpeg"},
    {"id": "cake", "title": "Birthday cake", "orientation": "portrait", "url": "/designs/cake.jpeg"},
    {"id": "moon", "title": "Moonlit cottage", "orientation": "landscape", "url": "/designs/moon.jpeg"},
    {"id": "bicycle", "title": "Café bicycle", "orientation": "landscape", "url": "/designs/bicycle.jpeg"},
]

LOCK = threading.Lock()


def load_env_file(path: Path) -> None:
    """Read backend/.env without python-dotenv. Existing process env wins."""
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip().strip('"').strip("'")


load_env_file(ROOT / "backend" / ".env")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def db_path() -> Path:
    DATA.mkdir(parents=True, exist_ok=True)
    return DATA / "db.json"


def load_db() -> dict:
    path = db_path()
    if not path.exists():
        return {"users": [], "sessions": {}, "postcards": []}
    return json.loads(path.read_text())


def save_db(db: dict) -> None:
    path = db_path()
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(db))
    tmp.replace(path)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000)
    return f"pbkdf2_sha256$200000${salt}${digest.hex()}"


def check_password(password: str, hashed: str) -> bool:
    try:
        _algo, rounds, salt, hexdigest = hashed.split("$", 3)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds))
        return hmac.compare_digest(digest.hex(), hexdigest)
    except (ValueError, TypeError):
        return False


def normalize_email(email: str) -> str:
    cleaned = email.strip().lower()
    if "@" not in cleaned or cleaned.startswith("@") or cleaned.endswith("@"):
        raise ValueError("Enter a valid email address")
    return cleaned


def public_card(card: dict) -> dict:
    keys = (
        "share_id", "title", "front_image_url", "orientation", "size", "message",
        "recipient_name", "sender_name", "stamp_id", "seal_color", "date_str",
    )
    return {key: card[key] for key in keys}


def owner_card(card: dict) -> dict:
    hidden = {"_id"}
    return {key: value for key, value in card.items() if key not in hidden}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        print(f"{self.address_string()} {fmt % args}")

    def do_GET(self) -> None:
        self._handle("GET")

    def do_POST(self) -> None:
        self._handle("POST")

    def do_PUT(self) -> None:
        self._handle("PUT")

    def do_DELETE(self) -> None:
        self._handle("DELETE")

    def do_OPTIONS(self) -> None:
        self._send(204, b"", "text/plain")

    def _handle(self, method: str) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        try:
            if path.startswith("/api/"):
                self._api(method, path)
                return
            if method != "GET":
                self._send(405, b"Method not allowed", "text/plain")
                return
            self._static(path)
        except Exception as exc:  # last-resort so a bad request never kills the server
            print("request failed", exc)
            self._send_json(500, {"detail": "Something went wrong"})

    def _api(self, method: str, path: str) -> None:
        body = self._json_body() if method in {"POST", "PUT"} and not path.startswith("/api/uploads") else {}
        if path == "/api/clerk/config" and method == "GET":
            self._send_json(200, {"enabled": False, "publishable_key": "", "proxy_url": ""})
            return
        if path == "/api/today" and method == "GET":
            self._send_json(200, {"date": today_iso()})
            return
        if path == "/api/designs" and method == "GET":
            self._send_json(200, DESIGNS)
            return
        if path == "/api/auth/signup" and method == "POST":
            self._signup(body)
            return
        if path == "/api/auth/login" and method == "POST":
            self._login(body)
            return
        if path == "/api/me" and method == "GET":
            self._me()
            return
        if path == "/api/postcards" and method == "GET":
            self._list_cards()
            return
        if path == "/api/postcards" and method == "POST":
            self._create_card(body)
            return
        match = re.fullmatch(r"/api/postcards/([^/]+)/anyone-link", path)
        if match and method == "GET":
            self._anyone_link(match.group(1))
            return
        match = re.fullmatch(r"/api/postcards/([^/]+)/email", path)
        if match and method == "POST":
            self._email_card(match.group(1), body)
            return
        match = re.fullmatch(r"/api/postcards/([^/]+)", path)
        if match and method == "GET":
            self._get_card(match.group(1))
            return
        if match and method == "PUT":
            self._update_card(match.group(1), body)
            return
        if match and method == "DELETE":
            self._delete_card(match.group(1))
            return
        match = re.fullmatch(r"/api/public/postcards/([^/]+)", path)
        if match and method == "GET":
            self._public_card(match.group(1))
            return
        match = re.fullmatch(r"/api/public/postcards/([^/]+)/open", path)
        if match and method == "POST":
            self._record_open(match.group(1))
            return
        if path == "/api/uploads" and method == "POST":
            self._upload()
            return
        match = re.fullmatch(r"/api/uploads/([^/]+)", path)
        if match and method == "GET":
            self._upload_file(match.group(1))
            return
        self._send_json(404, {"detail": "Not found"})

    def _signup(self, body: dict) -> None:
        try:
            email = normalize_email(str(body.get("email", "")))
        except ValueError as exc:
            self._send_json(422, {"detail": str(exc)})
            return
        password = str(body.get("password", ""))
        if len(password) < 8:
            self._send_json(422, {"detail": "Password must be at least 8 characters"})
            return
        name = str(body.get("name", "")).strip() or email.split("@", 1)[0]
        name = name[:80]
        with LOCK:
            db = load_db()
            if any(user["email"] == email for user in db["users"]):
                self._send_json(409, {"detail": "An account with that email already exists"})
                return
            user_id = str(uuid.uuid4())
            db["users"].append({
                "user_id": user_id,
                "email": email,
                "name": name,
                "password": hash_password(password),
                "created_at": now_iso(),
            })
            token = secrets.token_urlsafe(24)
            db["sessions"][token] = user_id
            save_db(db)
        self._send_json(200, {"token": token, "user": {"user_id": user_id, "email": email, "name": name}})

    def _login(self, body: dict) -> None:
        try:
            email = normalize_email(str(body.get("email", "")))
        except ValueError:
            self._send_json(401, {"detail": "Email or password is incorrect"})
            return
        password = str(body.get("password", ""))
        with LOCK:
            db = load_db()
            user = next((item for item in db["users"] if item["email"] == email), None)
            if not user or not check_password(password, user["password"]):
                self._send_json(401, {"detail": "Email or password is incorrect"})
                return
            token = secrets.token_urlsafe(24)
            db["sessions"][token] = user["user_id"]
            save_db(db)
        self._send_json(200, {
            "token": token,
            "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"]},
        })

    def _user(self) -> dict | None:
        header = self.headers.get("Authorization", "")
        token = header[7:] if header.lower().startswith("bearer ") else ""
        if not token:
            return None
        with LOCK:
            db = load_db()
            user_id = db["sessions"].get(token)
            if not user_id:
                return None
            return next((item for item in db["users"] if item["user_id"] == user_id), None)

    def _require(self) -> dict | None:
        user = self._user()
        if not user:
            self._send_json(401, {"detail": "Not signed in"})
        return user

    def _me(self) -> None:
        user = self._require()
        if not user:
            return
        with LOCK:
            db = load_db()
            count = sum(1 for card in db["postcards"] if card["owner_id"] == user["user_id"])
        self._send_json(200, {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "image_url": "",
            "postcards_count": count,
            "created_at": user["created_at"],
        })

    def _card_from_body(self, body: dict, owner_id: str, existing: dict | None = None) -> dict:
        front = str(body.get("front_image_url") or (existing or {}).get("front_image_url") or "").strip()
        if not front:
            raise ValueError("Choose a design or upload a photo")
        orientation = body.get("orientation") or "landscape"
        size = body.get("size") or "standard"
        if orientation not in {"landscape", "portrait"} or size not in {"standard", "large", "square"}:
            raise ValueError("That size or orientation is not available")
        message = str(body.get("message") or "")
        if len(message) > 600:
            raise ValueError("Keep the message to 600 characters")
        base = existing or {
            "id": str(uuid.uuid4()),
            "share_id": secrets.token_urlsafe(9),
            "owner_id": owner_id,
            "created_at": now_iso(),
            "opened_count": 0,
            "last_opened_at": None,
            "opens": [],
            "date_str": today_iso(),
        }
        base.update({
            "title": str(body.get("title") or "Untitled postcard")[:120],
            "front_image_url": front,
            "orientation": orientation,
            "size": size,
            "message": message,
            "recipient_name": str(body.get("recipient_name") or "")[:80],
            "sender_name": str(body.get("sender_name") or "")[:80],
            "stamp_id": str(body.get("stamp_id") or "vintage_airmail"),
            "seal_color": str(body.get("seal_color") or "#B83A28"),
            "is_draft": bool(body.get("is_draft", True)),
            "updated_at": now_iso(),
        })
        return base

    def _list_cards(self) -> None:
        user = self._require()
        if not user:
            return
        with LOCK:
            db = load_db()
            cards = [owner_card(card) for card in db["postcards"] if card["owner_id"] == user["user_id"]]
        cards.sort(key=lambda card: card["updated_at"], reverse=True)
        self._send_json(200, cards)

    def _create_card(self, body: dict) -> None:
        user = self._require()
        if not user:
            return
        try:
            card = self._card_from_body(body, user["user_id"])
        except ValueError as exc:
            self._send_json(422, {"detail": str(exc)})
            return
        with LOCK:
            db = load_db()
            db["postcards"].append(card)
            save_db(db)
        self._send_json(200, owner_card(card))

    def _owned(self, card_id: str, user_id: str) -> tuple[dict, dict, int] | None:
        db = load_db()
        for index, card in enumerate(db["postcards"]):
            if card["id"] == card_id and card["owner_id"] == user_id:
                return db, card, index
        return None

    def _get_card(self, card_id: str) -> None:
        user = self._require()
        if not user:
            return
        with LOCK:
            found = self._owned(card_id, user["user_id"])
        if not found:
            self._send_json(404, {"detail": "Postcard not found"})
            return
        self._send_json(200, owner_card(found[1]))

    def _update_card(self, card_id: str, body: dict) -> None:
        user = self._require()
        if not user:
            return
        with LOCK:
            found = self._owned(card_id, user["user_id"])
            if not found:
                self._send_json(404, {"detail": "Postcard not found"})
                return
            db, card, index = found
            try:
                updated = self._card_from_body(body, user["user_id"], card)
            except ValueError as exc:
                self._send_json(422, {"detail": str(exc)})
                return
            db["postcards"][index] = updated
            save_db(db)
        self._send_json(200, owner_card(updated))

    def _email_card(self, card_id: str, body: dict) -> None:
        user = self._require()
        if not user:
            return
        with LOCK:
            found = self._owned(card_id, user["user_id"])
        if not found:
            self._send_json(404, {"detail": "Postcard not found"})
            return
        card = found[1]
        if card.get("is_draft"):
            self._send_json(409, {"detail": "Seal the postcard before emailing it."})
            return
        link = anyone_url(card)
        try:
            sent_to = send_postcard_email(
                str(body.get("to") or ""),
                link,
                card.get("recipient_name") or "",
                card.get("sender_name") or "",
                card.get("message") or "",
                card.get("share_id") or "",
            )
        except MailError as exc:
            self._send_json(exc.status, {"detail": str(exc)})
            return
        self._send_json(200, {"sent": True, "to": sent_to, "url": link})

    def _anyone_link(self, card_id: str) -> None:
        user = self._require()
        if not user:
            return
        with LOCK:
            found = self._owned(card_id, user["user_id"])
        if not found:
            self._send_json(404, {"detail": "Postcard not found"})
            return
        self._send_json(200, {"url": anyone_url(found[1])})

    def _delete_card(self, card_id: str) -> None:
        user = self._require()
        if not user:
            return
        with LOCK:
            db = load_db()
            before = len(db["postcards"])
            db["postcards"] = [card for card in db["postcards"] if not (card["id"] == card_id and card["owner_id"] == user["user_id"])]
            if len(db["postcards"]) == before:
                self._send_json(404, {"detail": "Postcard not found"})
                return
            save_db(db)
        self._send(204, b"", "text/plain")

    def _public_card(self, share_id: str) -> None:
        with LOCK:
            db = load_db()
            card = next((item for item in db["postcards"] if item["share_id"] == share_id and not item["is_draft"]), None)
        if not card:
            self._send_json(404, {"detail": "This postcard could not be found"})
            return
        self._send_json(200, public_card(card))

    def _record_open(self, share_id: str) -> None:
        with LOCK:
            db = load_db()
            card = next((item for item in db["postcards"] if item["share_id"] == share_id and not item["is_draft"]), None)
            if not card:
                self._send_json(404, {"detail": "This postcard could not be found"})
                return
            stamp = now_iso()
            card["opened_count"] = int(card.get("opened_count") or 0) + 1
            card["last_opened_at"] = stamp
            opens = list(card.get("opens") or [])
            device = self.headers.get("User-Agent", "")[:160]
            opens.append({"at": stamp, "device": device})
            card["opens"] = opens[-50:]
            save_db(db)
        self._send(204, b"", "text/plain")

    def _upload(self) -> None:
        user = self._require()
        if not user:
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length > MAX_UPLOAD + 64_000:
            self._send_json(413, {"detail": "Image must be 8 MB or smaller"})
            return
        raw = self.rfile.read(length)
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            self._send_json(400, {"detail": "Please upload a JPG, PNG, WEBP or GIF image"})
            return
        message = BytesParser(policy=email_default).parsebytes(
            f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode() + raw
        )
        file_part = None
        for part in message.iter_attachments() if message.is_multipart() else []:
            file_part = part
            break
        if file_part is None and message.is_multipart():
            for part in message.walk():
                if part.get_content_disposition() == "form-data" and part.get_filename():
                    file_part = part
                    break
        if file_part is None:
            self._send_json(400, {"detail": "Please upload a JPG, PNG, WEBP or GIF image"})
            return
        media = file_part.get_content_type()
        if media not in ALLOWED_TYPES:
            self._send_json(400, {"detail": "Please upload a JPG, PNG, WEBP or GIF image"})
            return
        data = file_part.get_payload(decode=True) or b""
        if len(data) > MAX_UPLOAD:
            self._send_json(413, {"detail": "Image must be 8 MB or smaller"})
            return
        upload_id = str(uuid.uuid4())
        folder = DATA / "uploads"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / upload_id).write_bytes(data)
        (folder / f"{upload_id}.type").write_text(media)
        self._send_json(200, {"url": f"/api/uploads/{upload_id}"})

    def _upload_file(self, upload_id: str) -> None:
        if not re.fullmatch(r"[0-9a-fA-F-]{36}", upload_id):
            self._send_json(404, {"detail": "Image not found"})
            return
        path = DATA / "uploads" / upload_id
        type_path = DATA / "uploads" / f"{upload_id}.type"
        if not path.exists():
            self._send_json(404, {"detail": "Image not found"})
            return
        media = type_path.read_text().strip() if type_path.exists() else "application/octet-stream"
        payload = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", media)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(payload)

    def _static(self, path: str) -> None:
        if path in {"/", "/sign-in", "/sign-up", "/app", "/app/new"} or path.startswith("/app/edit/") or path.startswith("/p/"):
            payload = INDEX.read_bytes()
            self._send(200, payload, "text/html; charset=utf-8")
            return
        relative = path.lstrip("/")
        candidate = (PUBLIC / relative).resolve()
        if not str(candidate).startswith(str(PUBLIC.resolve())) or not candidate.is_file():
            self._send_json(404, {"detail": "Not found"})
            return
        media = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        payload = candidate.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", media)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(payload)

    def _json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return {}
        if length > 1_000_000:
            return {}
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode())
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}

    def _send_json(self, status: int, payload: object) -> None:
        body = json.dumps(payload).encode()
        self._send(status, body, "application/json")

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.end_headers()
        if body:
            self.wfile.write(body)


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Whimsy Post preview on http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
