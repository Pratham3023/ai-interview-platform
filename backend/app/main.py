"""
FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import get_mongo_db, close_mongo, close_redis
from app.api.auth import router as auth_router
from app.api.resume import router as resume_router
from app.api.interview import router as interview_router
from app.api.coding import router as coding_router
from app.api.results import (
    scoring_router, feedback_router, roadmap_router, dashboard_router
)

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warm up connections
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    await get_mongo_db()
    yield
    # Shutdown: close connections
    await close_mongo()
    await close_redis()
    logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Adaptive AI-Powered Interview Preparation System with Personalized Learning Roadmap",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
cors_kwargs = {
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

if "*" in settings.ALLOWED_ORIGINS:
    cors_kwargs["allow_origins"] = ["*"]
    cors_kwargs["allow_credentials"] = False
else:
    cors_kwargs["allow_origins"] = settings.ALLOWED_ORIGINS
    cors_kwargs["allow_credentials"] = True

app.add_middleware(CORSMiddleware, **cors_kwargs)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(resume_router)
app.include_router(interview_router)
app.include_router(coding_router)
app.include_router(scoring_router)
app.include_router(feedback_router)
app.include_router(roadmap_router)
app.include_router(dashboard_router)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/", tags=["health"])
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": "/docs",
        "version": settings.APP_VERSION,
    }
