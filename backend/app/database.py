"""
Database connections — MongoDB (Motor async) and Redis (async)
Includes automated fallback to disk-persistent mocks (mongomock_motor & fakeredis)
if cloud/local database instances are unreachable, ensuring user accounts,
sessions, and roadmaps are NEVER lost on server restart.
"""

import os
import json
import uuid
import pickle
import logging
import asyncio
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from redis.asyncio import from_url as redis_from_url
from app.config import settings

logger = logging.getLogger(__name__)

_mongo_client = None
_db = None
_redis = None
_is_mock_mongo = False
_is_mock_redis = False

COLLECTIONS_TO_PERSIST = ["users", "resumes", "sessions", "feedbacks", "roadmaps"]
STORAGE_PATH = Path(__file__).resolve().parent.parent / "data" / "local_storage.pkl"


class PersistentCollection:
    """Wrapper around mock collection that automatically persists data on mutations."""

    def __init__(self, coll, db_ref, coll_name: str):
        self._coll = coll
        self._db_ref = db_ref
        self._coll_name = coll_name

    def __getattr__(self, name):
        attr = getattr(self._coll, name)
        if name in (
            "insert_one", "insert_many",
            "update_one", "update_many",
            "replace_one",
            "delete_one", "delete_many",
            "find_one_and_update", "find_one_and_replace", "find_one_and_delete"
        ):
            async def wrapped(*args, **kwargs):
                res = await attr(*args, **kwargs)
                await self._db_ref._save()
                return res
            return wrapped
        return attr


class PersistentDatabase:
    """Wrapper around mock database that persists collections to disk."""

    def __init__(self, raw_db):
        self._raw_db = raw_db

    def __getattr__(self, name):
        attr = getattr(self._raw_db, name)
        if callable(attr) and name in ("command", "list_collection_names", "drop_collection"):
            return attr
        return PersistentCollection(attr, self, name)

    def __getitem__(self, name):
        coll = self._raw_db[name]
        return PersistentCollection(coll, self, name)

    async def _save(self):
        try:
            STORAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
            data = {}
            for cname in COLLECTIONS_TO_PERSIST:
                data[cname] = await self._raw_db[cname].find({}).to_list(None)
            tmp_path = STORAGE_PATH.with_suffix(".tmp")
            with open(tmp_path, "wb") as f:
                pickle.dump(data, f)
            os.replace(tmp_path, STORAGE_PATH)
        except Exception as e:
            logger.warning("Could not persist mock database state: %s", e)

    async def _load(self):
        if not STORAGE_PATH.exists():
            return
        try:
            with open(STORAGE_PATH, "rb") as f:
                data = pickle.load(f)
            total_loaded = 0
            for cname, docs in data.items():
                if docs:
                    await self._raw_db[cname].insert_many(docs)
                    total_loaded += len(docs)
            logger.info("Restored %d persistent documents across %d collections from %s", total_loaded, len(data), STORAGE_PATH.name)
        except Exception as e:
            logger.warning("Could not load persistent database state: %s", e)


async def _seed_questions_if_needed(db):
    """Seed initial interview questions if the questions collection is empty."""
    try:
        count = await db.questions.count_documents({})
        if count > 0:
            return
        questions_path = Path(__file__).resolve().parent.parent / "data" / "questions.json"
        if not questions_path.exists():
            logger.warning("questions.json not found at %s", questions_path)
            return

        with open(questions_path, "r", encoding="utf-8") as f:
            questions = json.load(f)

        for q in questions:
            if "_id" not in q:
                q["_id"] = str(uuid.uuid4())

        await db.questions.insert_many(questions)
        logger.info("Successfully auto-seeded %d questions into database.", len(questions))
    except Exception as e:
        logger.warning("Could not auto-seed questions: %s", e)


async def get_mongo_db() -> AsyncIOMotorDatabase:
    global _mongo_client, _db, _is_mock_mongo
    if _db is not None:
        return _db

    # 1. Attempt connection to configured MONGODB_URI
    try:
        candidate_client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            socketTimeoutMS=2000,
            maxPoolSize=100,
            minPoolSize=10,
        )
        # Verify connectivity
        await asyncio.wait_for(candidate_client.admin.command("ping"), timeout=2.5)
        _mongo_client = candidate_client
        _db = _mongo_client[settings.MONGODB_DB_NAME]
        _is_mock_mongo = False
        logger.info("Connected to MongoDB: %s / %s", settings.MONGODB_URI, settings.MONGODB_DB_NAME)
    except Exception as e:
        logger.warning(
            "Primary MongoDB unreachable (%s). Initializing persistent fallback database...",
            e,
        )
        try:
            import mongomock_motor
            _mongo_client = mongomock_motor.AsyncMongoMockClient()
            raw_db = _mongo_client[settings.MONGODB_DB_NAME]
            persistent_db = PersistentDatabase(raw_db)
            await persistent_db._load()
            _db = persistent_db
            _is_mock_mongo = True
            logger.info("Persistent fallback database initialized successfully.")
        except Exception as mock_err:
            logger.error("Failed to initialize persistent fallback database: %s", mock_err)
            raise

    # 2. Setup indexes safely
    try:
        await _db.sessions.create_index("user_id")
        await _db.questions.create_index([("type", 1), ("topic", 1)])
        await _db.questions.create_index("role_category")
        await _db.users.create_index("email", unique=True)
    except Exception as idx_err:
        logger.debug("Index configuration notice: %s", idx_err)

    # 3. Ensure questions are seeded
    await _seed_questions_if_needed(_db)

    return _db


async def get_redis():
    global _redis, _is_mock_redis
    if _redis is not None:
        return _redis

    # 1. Attempt real Redis connection
    try:
        candidate_redis = await redis_from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2.0,
            socket_timeout=2.0,
        )
        await asyncio.wait_for(candidate_redis.ping(), timeout=2.5)
        _redis = candidate_redis
        _is_mock_redis = False
        logger.info("Connected to Redis: %s", settings.REDIS_URL)
        return _redis
    except Exception as e:
        logger.warning(
            "Primary Redis unreachable (%s). Initializing in-memory fallback (fakeredis)...",
            e,
        )
        try:
            import fakeredis.aioredis
            _redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
            _is_mock_redis = True
            logger.info("In-memory FakeRedis initialized successfully.")
            return _redis
        except Exception as fake_err:
            logger.error("Failed to initialize fakeredis: %s", fake_err)
            raise


async def close_mongo():
    global _mongo_client, _db
    if _db is not None and hasattr(_db, "_save"):
        try:
            await _db._save()
        except Exception:
            pass
    if _mongo_client is not None:
        try:
            if hasattr(_mongo_client, "close"):
                _mongo_client.close()
        except Exception:
            pass
        _mongo_client = None
        _db = None


async def close_redis():
    global _redis
    if _redis is not None:
        try:
            if hasattr(_redis, "aclose"):
                await _redis.aclose()
            elif hasattr(_redis, "close"):
                res = _redis.close()
                if asyncio.iscoroutine(res):
                    await res
        except Exception:
            pass
        _redis = None
