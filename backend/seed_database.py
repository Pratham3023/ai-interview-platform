"""
Database Seed Script
Run this to populate MongoDB with:
  - 300+ interview questions
  - Indexes

Usage:
    cd backend
    python seed_database.py
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings


async def seed():
    print("=" * 60)
    print("  Adaptive AI Interview System — Database Seeder")
    print("=" * 60)
    print(f"\nConnecting to MongoDB: {settings.MONGODB_URI}")

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    # ── Questions ─────────────────────────────────────────────────────────────
    questions_path = Path(__file__).parent / "data" / "questions.json"
    if not questions_path.exists():
        print(f"ERROR: {questions_path} not found")
        return

    with open(questions_path, "r", encoding="utf-8") as f:
        questions = json.load(f)

    import uuid
    # Assign UUIDs as _id if not present
    for q in questions:
        if "_id" not in q:
            q["_id"] = str(uuid.uuid4())

    existing = await db.questions.count_documents({})
    if existing > 0:
        print(f"\n✓ Questions already seeded ({existing} docs). Skipping.")
        print("  To re-seed, drop the 'questions' collection first.")
    else:
        result = await db.questions.insert_many(questions)
        print(f"\n✓ Inserted {len(result.inserted_ids)} questions")

    # ── Indexes ───────────────────────────────────────────────────────────────
    print("\nCreating indexes...")
    await db.users.create_index("email", unique=True)
    await db.sessions.create_index("user_id")
    await db.sessions.create_index("created_at")
    await db.questions.create_index("topic")
    await db.questions.create_index("difficulty")
    await db.questions.create_index([("topic", 1), ("difficulty", 1)])
    await db.questions.create_index([("topic", 1), ("type", 1), ("difficulty", 1)])
    await db.resumes.create_index("user_id")
    await db.roadmaps.create_index("session_id")
    await db.feedbacks.create_index("session_id")
    print("✓ Indexes created")

    # ── Summary ───────────────────────────────────────────────────────────────
    total_q = await db.questions.count_documents({})
    topics = await db.questions.distinct("topic")
    coding_q = await db.questions.count_documents({"requires_code": True})
    easy_q = await db.questions.count_documents({"difficulty": "easy"})
    medium_q = await db.questions.count_documents({"difficulty": "medium"})
    hard_q = await db.questions.count_documents({"difficulty": "hard"})

    print(f"\n{'=' * 60}")
    print(f"  Seed Complete!")
    print(f"{'=' * 60}")
    print(f"  Total questions : {total_q}")
    print(f"  Topics          : {', '.join(sorted(topics))}")
    print(f"  Coding questions: {coding_q}")
    print(f"  Easy / Med / Hard: {easy_q} / {medium_q} / {hard_q}")
    print(f"{'=' * 60}\n")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
