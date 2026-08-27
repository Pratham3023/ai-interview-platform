import asyncio
import os
import json
from app.config import settings

# Override settings to ensure we don't try to connect to non-existent APIs if we don't have keys yet
settings.GEMINI_API_KEY = "test_key"
settings.JUDGE0_API_KEY = "test_key"

from app.database import get_mongo_db, get_redis, close_mongo, close_redis
from app.services.skill_extraction import resume_parser
from app.services.nlp_evaluator import nlp_evaluator
from app.services.scoring_engine import scoring_engine
from app.services.voice_analyzer import voice_analyzer
from app.services.adaptive_algorithm import adaptive_engine
from app.services.roadmap_generator import roadmap_generator

async def run_tests():
    print("Testing MongoDB Connection...")
    try:
        db = await get_mongo_db()
        await db.command("ping")
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"❌ MongoDB failed: {e}")

    print("Testing Redis Connection...")
    try:
        redis = await get_redis()
        await redis.ping()
        print("✅ Redis connected")
    except Exception as e:
        print(f"❌ Redis failed: {e}")

    print("Testing NLP Evaluator Sync Functions...")
    try:
        res = nlp_evaluator.evaluate_answer_sync(
            "What is Python?", "Python is a programming language.", "Python", ["programming", "language"]
        )
        if "keyword_score" in res:
            print("✅ NLP Evaluator sync OK")
        else:
            print("❌ NLP Evaluator failed")
    except Exception as e:
        print(f"❌ NLP Evaluator failed: {e}")
        
    print("Testing Scoring Engine...")
    try:
        class DummySession:
            technical_score = 8.0
            coding_score = 7.0
            answer_quality_score = 6.0
            keyword_coverage_score = 9.0
            communication_score = 7.5
            confidence_indicator = 8.0
        scores = scoring_engine._calculate_composite(DummySession())
        if scores > 0:
            print("✅ Scoring Engine OK")
    except Exception as e:
        print(f"❌ Scoring Engine failed: {e}")

    await close_mongo()
    await close_redis()
    print("Finished.")

if __name__ == "__main__":
    asyncio.run(run_tests())
