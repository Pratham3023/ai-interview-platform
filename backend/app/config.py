"""
Configuration — central environment settings
"""

from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "Adaptive AI Interview System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── MongoDB ───────────────────────────────────────────────────────────────
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "interview_system"

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_SESSION_TTL: int = 3600  # 1 hour

    # ── Gemini AI ─────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # ── Piston Code Execution ─────────────────────────────────────────────────────
    PISTON_API_URL: str = Field("https://emacs.piston.rs/api/v2")

    # ── ElevenLabs TTS (optional) ─────────────────────────────────────────────
    ELEVENLABS_API_KEY: str = ""

    # ── Scoring Weights ───────────────────────────────────────────────────────
    SCORE_WEIGHT_TECHNICAL: float = 0.30
    SCORE_WEIGHT_CODING: float = 0.25
    SCORE_WEIGHT_ANSWER_QUALITY: float = 0.15
    SCORE_WEIGHT_KEYWORD: float = 0.10
    SCORE_WEIGHT_COMMUNICATION: float = 0.10
    SCORE_WEIGHT_CONFIDENCE: float = 0.10

    # ── Thresholds ────────────────────────────────────────────────────────────
    THRESHOLD_WEAK: float = 60.0
    THRESHOLD_NEEDS_IMPROVEMENT: float = 75.0

    # ── Interview ─────────────────────────────────────────────────────────────
    MAX_QUESTIONS_PER_SESSION: int = 15
    MAX_RESUME_SIZE_MB: float = 10.0
    ALLOWED_RESUME_TYPES: List[str] = ["application/pdf"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
