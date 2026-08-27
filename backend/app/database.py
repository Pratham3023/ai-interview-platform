"""
Database connections — MongoDB (Motor async) and Redis (async)
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from redis.asyncio import from_url as redis_from_url
from app.config import settings

logger = logging.getLogger(__name__)

_mongo_client: AsyncIOMotorClient = None
_db: AsyncIOMotorDatabase = None
_redis = None


async def get_mongo_db() -> AsyncIOMotorDatabase:
    global _mongo_client, _db
    if _db is None:
        _mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
        _db = _mongo_client[settings.MONGODB_DB_NAME]
        logger.info("MongoDB connected: %s / %s", settings.MONGODB_URI, settings.MONGODB_DB_NAME)
    return _db


async def get_redis():
    global _redis
    if _redis is None:
        _redis = await redis_from_url(settings.REDIS_URL, decode_responses=True)
        logger.info("Redis connected: %s", settings.REDIS_URL)
    return _redis


async def close_mongo():
    global _mongo_client, _db
    if _mongo_client:
        _mongo_client.close()
        _mongo_client = None
        _db = None


async def close_redis():
    global _redis
    if _redis:
        await _redis.aclose()
        _redis = None
