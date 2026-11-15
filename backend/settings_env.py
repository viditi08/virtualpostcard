"""Deployed defaults. Render's dashboard value is used when it is already valid."""

import os

DEFAULTS = {
    "MONGO_URL": "mongodb+srv://postcarddeliveryy_db_user:DY3kaMdVdwaslTBd@cluster0.hyv9ef5.mongodb.net/whimsy_post",
    "DB_NAME": "whimsy_post",
    "CORS_ORIGINS": "*",
    "SMTP_HOST": "smtp.gmail.com",
    "SMTP_PORT": "587",
    "SMTP_USER": "postcarddeliveryy@gmail.com",
    "SMTP_PASSWORD": "rjlzqdynuqmqzeqo",
    "SMTP_FROM": "postcarddeliveryy@gmail.com",
    "SMTP_FROM_NAME": "Postcard Delivery",
    "SMTP_STARTTLS": "1",
    "PUBLIC_BASE_URL": "https://virtualpostcard.onrender.com",
}


def mongo_url_from(raw: str) -> str:
    """The connection string, even if the value has quotes or extra words around it."""
    text = raw.replace("\n", " ").strip().strip('"').strip("'")
    if text.lower().startswith("mongo_url="):
        text = text.split("=", 1)[1].strip().strip('"').strip("'")
    for scheme in ("mongodb+srv://", "mongodb://"):
        at = text.find(scheme)
        if at >= 0:
            return text[at:].split()[0].rstrip(".,;")
    return text


def apply() -> None:
    for key, value in DEFAULTS.items():
        current = os.environ.get(key, "")
        if key == "MONGO_URL":
            cleaned = mongo_url_from(current)
            os.environ[key] = cleaned if cleaned.startswith(("mongodb://", "mongodb+srv://")) else value
        elif not current.strip():
            os.environ[key] = value
