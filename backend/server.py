import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=True)
from settings_env import apply  # noqa: E402

apply()

# MongoDB connection
from lib.db import client, db, ensure_indexes  # noqa: E402


# Startup runs before the yield, shutdown after it. Add your own setup/teardown here.
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.index_task = asyncio.create_task(ensure_indexes())  # background: a big index build must not block boot
    yield
    client.close()


# Create the main app without a prefix
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.model_dump())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

from clerk_auth import clerk_router  # noqa: E402
from local_auth import local_router  # noqa: E402
from routers.postcards import router as postcards_router  # noqa: E402

api_router.include_router(postcards_router)
api_router.include_router(local_router)
app.include_router(clerk_router)  # /api/clerk/config and /api/__clerk/*

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# The built React app is served by this same process, so one host has both the
# site and /api. Leave this off when frontend/dist has not been built yet.
FRONTEND_DIST = (ROOT_DIR.parent / "frontend" / "dist").resolve()


def _frontend_file(full_path: str) -> Path | None:
    if not full_path:
        return None
    candidate = (FRONTEND_DIST / full_path).resolve()
    try:
        candidate.relative_to(FRONTEND_DIST)
    except ValueError:
        return None
    if candidate.is_file():
        return candidate
    return None


def _mount_frontend() -> None:
    index = FRONTEND_DIST / "index.html"
    if not index.is_file():
        logger.info("frontend dist missing at %s; serving the API only", FRONTEND_DIST)
        return

    @app.get("/{full_path:path}", include_in_schema=False)
    async def frontend(full_path: str):
        found = _frontend_file(full_path)
        if found is not None:
            return FileResponse(found)
        return FileResponse(index)


_mount_frontend()
