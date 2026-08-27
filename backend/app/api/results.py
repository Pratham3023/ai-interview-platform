"""
Scoring, Feedback, Roadmap, and Dashboard API Routes
"""

from datetime import datetime
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_mongo_db
from app.api.auth import get_current_user
from app.services.scoring_engine import scoring_engine
from app.services.feedback_engine import feedback_engine
from app.services.roadmap_generator import roadmap_generator
from app.schemas import (
    ScoreResponse, FeedbackResponse, RoadmapResponse,
    DashboardResponse, SessionSummary, UserResponse,
    WeekPlanSchema, DailyTaskSchema,
)

# ── Scoring ───────────────────────────────────────────────────────────────────

scoring_router = APIRouter(prefix="/api/scoring", tags=["scoring"])


@scoring_router.post("/{session_id}/compute", response_model=ScoreResponse)
async def compute_scores(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    session = await db.sessions.find_one(
        {"_id": session_id, "user_id": current_user["_id"]}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    answers = session.get("answers", [])
    coding_answers = [a for a in answers if a.get("question_type") == "coding"]
    prosodic_scores = session.get("prosodic_scores", [])

    # Compute topic scores
    topic_scores = scoring_engine.aggregate_topic_scores(answers)

    # Classify topics
    weak_topics, strong_topics, topic_statuses = scoring_engine.classify_topics(topic_scores)

    # Compute overall scores
    overall = scoring_engine.compute_overall_score(answers, coding_answers, prosodic_scores)

    # Persist scores to session
    update = {
        "topic_scores": topic_scores,
        "topic_statuses": topic_statuses,
        "weak_topics": weak_topics,
        "strong_topics": strong_topics,
        **overall,
    }
    await db.sessions.update_one({"_id": session_id}, {"$set": update})

    return ScoreResponse(
        session_id=session_id,
        overall_score=overall["overall_score"],
        technical_score=overall["technical_score"],
        coding_score=overall["coding_score"],
        communication_score=overall["communication_score"],
        confidence_indicator=overall["confidence_indicator"],
        answer_quality_score=overall["answer_quality_score"],
        keyword_coverage_score=overall["keyword_coverage_score"],
        topic_scores=topic_scores,
        topic_statuses=topic_statuses,
        weak_topics=weak_topics,
        strong_topics=strong_topics,
    )


@scoring_router.get("/{session_id}", response_model=ScoreResponse)
async def get_scores(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    session = await db.sessions.find_one(
        {"_id": session_id, "user_id": current_user["_id"]}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return ScoreResponse(
        session_id=session_id,
        overall_score=session.get("overall_score", 0.0),
        technical_score=session.get("technical_score", 0.0),
        coding_score=session.get("coding_score", 0.0),
        communication_score=session.get("communication_score", 0.0),
        confidence_indicator=session.get("confidence_indicator", 0.0),
        answer_quality_score=session.get("answer_quality_score", 0.0),
        keyword_coverage_score=session.get("keyword_coverage_score", 0.0),
        topic_scores=session.get("topic_scores", {}),
        topic_statuses=session.get("topic_statuses", {}),
        weak_topics=session.get("weak_topics", []),
        strong_topics=session.get("strong_topics", []),
    )


# ── Feedback ──────────────────────────────────────────────────────────────────

feedback_router = APIRouter(prefix="/api/feedback", tags=["feedback"])


@feedback_router.post("/{session_id}/generate", response_model=FeedbackResponse)
async def generate_feedback(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    session = await db.sessions.find_one(
        {"_id": session_id, "user_id": current_user["_id"]}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    feedback_data = await feedback_engine.generate(session)

    feedback_id = str(uuid.uuid4())
    doc = {
        "_id": feedback_id,
        "session_id": session_id,
        "user_id": current_user["_id"],
        **feedback_data,
        "generated_at": datetime.utcnow(),
    }
    await db.feedbacks.replace_one({"session_id": session_id}, doc, upsert=True)

    return FeedbackResponse(
        feedback_id=feedback_id,
        session_id=session_id,
        overall_summary=feedback_data["overall_summary"],
        strengths=feedback_data["strengths"],
        weaknesses=feedback_data["weaknesses"],
        technical_feedback=feedback_data["technical_feedback"],
        communication_feedback=feedback_data["communication_feedback"],
        improvement_suggestions=feedback_data["improvement_suggestions"],
        generated_at=doc["generated_at"],
    )


@feedback_router.get("/{session_id}", response_model=FeedbackResponse)
async def get_feedback(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    doc = await db.feedbacks.find_one(
        {"session_id": session_id, "user_id": current_user["_id"]}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Feedback not generated yet. POST /generate first.")
    return FeedbackResponse(
        feedback_id=doc["_id"],
        session_id=session_id,
        overall_summary=doc.get("overall_summary", ""),
        strengths=doc.get("strengths", []),
        weaknesses=doc.get("weaknesses", []),
        technical_feedback=doc.get("technical_feedback", ""),
        communication_feedback=doc.get("communication_feedback", ""),
        improvement_suggestions=doc.get("improvement_suggestions", []),
        generated_at=doc["generated_at"],
    )


# ── Roadmap ───────────────────────────────────────────────────────────────────

roadmap_router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])


@roadmap_router.post("/{session_id}/generate", response_model=RoadmapResponse)
async def generate_roadmap(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    session = await db.sessions.find_one(
        {"_id": session_id, "user_id": current_user["_id"]}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    weak_topics = session.get("weak_topics", [])
    topic_scores = session.get("topic_scores", {})
    job_role = session.get("job_role", "Software Engineer")

    week_plans = roadmap_generator.generate(topic_scores, weak_topics, job_role)

    roadmap_id = str(uuid.uuid4())
    week_docs = [wp.dict() for wp in week_plans]
    doc = {
        "_id": roadmap_id,
        "session_id": session_id,
        "user_id": current_user["_id"],
        "job_role": job_role,
        "weak_topics": weak_topics,
        "weeks": week_docs,
        "total_weeks": len(week_plans),
        "generated_at": datetime.utcnow(),
    }
    await db.roadmaps.replace_one({"session_id": session_id}, doc, upsert=True)

    return RoadmapResponse(
        roadmap_id=roadmap_id,
        session_id=session_id,
        job_role=job_role,
        weak_topics=weak_topics,
        weeks=[
            WeekPlanSchema(
                week=wp.week,
                topic=wp.topic,
                focus=wp.focus,
                severity=wp.severity,
                daily_tasks=[
                    DailyTaskSchema(
                        day=dt.day,
                        task=dt.task,
                        resource_url=dt.resource_url,
                        resource_type=dt.resource_type,
                    )
                    for dt in wp.daily_tasks
                ],
            )
            for wp in week_plans
        ],
        total_weeks=len(week_plans),
        generated_at=doc["generated_at"],
    )


@roadmap_router.get("/{session_id}", response_model=RoadmapResponse)
async def get_roadmap(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    doc = await db.roadmaps.find_one(
        {"session_id": session_id, "user_id": current_user["_id"]}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Roadmap not generated yet.")

    return RoadmapResponse(
        roadmap_id=doc["_id"],
        session_id=session_id,
        job_role=doc.get("job_role", ""),
        weak_topics=doc.get("weak_topics", []),
        weeks=[WeekPlanSchema(**w) for w in doc.get("weeks", [])],
        total_weeks=doc.get("total_weeks", 0),
        generated_at=doc["generated_at"],
    )


# ── Dashboard ─────────────────────────────────────────────────────────────────

dashboard_router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@dashboard_router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    sessions = await db.sessions.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(50)

    summaries = [
        SessionSummary(
            session_id=s["_id"],
            job_role=s.get("job_role", ""),
            overall_score=s.get("overall_score", 0.0),
            status=s.get("status", "active"),
            created_at=s["created_at"],
            completed_at=s.get("completed_at"),
            weak_topics=s.get("weak_topics", []),
        )
        for s in sessions
    ]

    scores = [s.overall_score for s in summaries if s.overall_score > 0]
    best = max(scores) if scores else 0.0
    avg = sum(scores) / len(scores) if scores else 0.0

    return DashboardResponse(
        user=UserResponse(
            id=current_user["_id"],
            email=current_user["email"],
            full_name=current_user["full_name"],
            created_at=current_user["created_at"],
        ),
        total_sessions=len(sessions),
        latest_session=summaries[0] if summaries else None,
        all_sessions=summaries,
        best_score=round(best, 2),
        average_score=round(avg, 2),
        most_improved_topic=None,
    )
