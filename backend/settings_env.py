"""Non-secret defaults. Passwords and the database address come from the environment."""

import os

DEFAULTS = {
    "DB_NAME": "whimsy_post",
    "CORS_ORIGINS": "*",
    "SMTP_HOST": "smtp.gmail.com",
    "SMTP_PORT": "587",
    "SMTP_STARTTLS": "1",
    "SMTP_FROM_NAME": "Postcard Delivery",
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
        if not os.environ.get(key, "").strip():
            os.environ[key] = value
    cleaned = mongo_url_from(os.environ.get("MONGO_URL", ""))
    if cleaned.startswith(("mongodb://", "mongodb+srv://")):
        os.environ["MONGO_URL"] = cleaned
