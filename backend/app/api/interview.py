"""
Interview API Routes
Manages interview session lifecycle:
  POST /api/interview/start        → create session, return intro question
  POST /api/interview/answer       → submit answer, return next question + evaluation
  POST /api/interview/complete     → finalize session, compute all scores
  GET  /api/interview/{session_id} → get session details
  GET  /api/interview/             → list user's sessions
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

from app.database import get_mongo_db, get_redis
from app.api.auth import get_current_user
from app.services.adaptive_algorithm import adaptive_engine
from app.services.nlp_evaluator import nlp_evaluator
from app.services.scoring_engine import scoring_engine
from app.services.voice_analyzer import compute_confidence_score_from_features
from app.schemas import (
    StartInterviewRequest, StartInterviewResponse,
    SubmitAnswerRequest, SubmitAnswerResponse,
    QuestionResponse,
)
from app.config import settings

router = APIRouter(prefix="/api/interview", tags=["interview"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _q_to_response(q: Dict[str, Any]) -> QuestionResponse:
    return QuestionResponse(
        id=q["id"],
        question=q["question"],
        topic=q["topic"],
        subtopic=q.get("subtopic"),
        difficulty=q["difficulty"],
        type=q["type"],
        expected_keywords=q.get("expected_keywords", []),
        requires_code=q.get("requires_code", False),
        language_hint=q.get("language_hint"),
    )


# ── Start Interview ───────────────────────────────────────────────────────────

@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(
    data: StartInterviewRequest,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    redis: Redis = Depends(get_redis),
    current_user=Depends(get_current_user),
):
    # Verify resume exists
    resume = await db.resumes.find_one(
        {"_id": data.resume_id, "user_id": current_user["_id"]}
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    skill_profile = resume.get("skill_profile", {})
    if not skill_profile:
        raise HTTPException(
            status_code=422,
            detail="No skills detected in resume. Please upload a more detailed resume.",
        )

    # Create session in MongoDB
    session_id = str(uuid.uuid4())
    session_doc = {
        "_id": session_id,
        "user_id": current_user["_id"],
        "resume_id": data.resume_id,
        "job_role": data.job_role,
        "status": "active",
        "answers": [],
        "topic_scores": {},
        "topic_statuses": {},
        "weak_topics": [],
        "strong_topics": [],
        "overall_score": 0.0,
        "technical_score": 0.0,
        "coding_score": 0.0,
        "communication_score": 0.0,
        "confidence_indicator": 0.0,
        "answer_quality_score": 0.0,
        "keyword_coverage_score": 0.0,
        "prosodic_baseline": None,
        "prosodic_scores": [],
        "created_at": datetime.utcnow(),
        "completed_at": None,
    }
    await db.sessions.insert_one(session_doc)

    # Initialize Redis session state
    await adaptive_engine.create_session_state(redis, session_id, skill_profile, data.job_role)

    # Return intro question
    intro_q = adaptive_engine.get_intro_question()
    return StartInterviewResponse(
        session_id=session_id,
        first_question=_q_to_response(intro_q),
        message="Interview started. Please introduce yourself to begin.",
    )


# ── Submit Answer ─────────────────────────────────────────────────────────────

@router.post("/answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    data: SubmitAnswerRequest,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    redis: Redis = Depends(get_redis),
    current_user=Depends(get_current_user),
):
    # Validate session
    session = await db.sessions.find_one(
        {"_id": data.session_id, "user_id": current_user["_id"]}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "active":
        raise HTTPException(status_code=400, detail="Session is not active")

    # Fetch question details (if not intro)
    q_doc = None
    expected_keywords = []
    topic = "Introduction"
    ideal_answer = ""
    question_text = ""
    question_type = "intro"
    difficulty = "easy"

    if data.question_id != "intro_001" and not data.question_id.startswith("followup_"):
        q_doc = await db.questions.find_one({"_id": data.question_id})
        if q_doc:
            expected_keywords = q_doc.get("expected_keywords", [])
            topic = q_doc.get("topic", "General")
            ideal_answer = q_doc.get("ideal_answer", "")
            question_text = q_doc.get("question", "")
            question_type = q_doc.get("type", "technical")
            difficulty = q_doc.get("difficulty", "medium")
    elif data.question_id.startswith("followup_"):
        # Follow-up — get from Redis state
        state = await adaptive_engine.get_session_state(redis, data.session_id)
        if state and state.get("pending_followup"):
            fu = state["pending_followup"]
            expected_keywords = fu.get("expected_keywords", [])
            topic = fu.get("topic", "General")
            question_text = fu.get("question", "")
            question_type = "technical"
            difficulty = fu.get("difficulty", "medium")
    else:
        # Intro question
        question_text = "Introduce Yourself"
        expected_keywords = ["skills", "experience", "projects", "goals"]

    # ── Evaluate Answer ───────────────────────────────────────────────────────
    # use_llm=False: skip Gemini during live interview to keep response fast.
    # Full LLM feedback is generated separately in /api/feedback/{session_id}/generate
    eval_result = await nlp_evaluator.evaluate_answer_full(
        question=question_text,
        answer=data.answer_text,
        topic=topic,
        expected_keywords=expected_keywords,
        ideal_answer=ideal_answer,
        use_llm=False,
    )

    # ── Prosodic Score ────────────────────────────────────────────────────────
    prosodic_score = 5.0
    if data.audio_features:
        af = data.audio_features
        prosodic_score = compute_confidence_score_from_features(
            pitch_variance=af.get("pitch_variance", 0),
            speech_rate=af.get("speech_rate", 0),
            pause_count=af.get("pause_count", 0),
            baseline=session.get("prosodic_baseline"),
        )

    # ── Composite Score ───────────────────────────────────────────────────────
    composite = scoring_engine.compute_composite_score(
        keyword_score=eval_result["keyword_score"],
        semantic_score=eval_result["semantic_score"],
        llm_score=eval_result.get("llm_score", eval_result["keyword_score"]),
        prosodic_score=prosodic_score,
    )

    # ── If intro, set prosodic baseline ──────────────────────────────────────
    update_fields: Dict[str, Any] = {}
    if data.question_id == "intro_001" and data.audio_features:
        update_fields["prosodic_baseline"] = data.audio_features

    # ── Save Answer to Session ────────────────────────────────────────────────
    answer_record = {
        "question_id": data.question_id,
        "question_text": question_text,
        "topic": topic,
        "difficulty": difficulty,
        "question_type": question_type,
        "answer_text": data.answer_text,
        "keyword_score": eval_result["keyword_score"],
        "semantic_score": eval_result["semantic_score"],
        "llm_score": eval_result.get("llm_score", 5.0),
        "coding_score": 0.0,
        "composite_score": composite,
        "matched_keywords": eval_result["matched_keywords"],
        "missed_keywords": eval_result["missed_keywords"],
        "answered_at": datetime.utcnow(),
        "is_follow_up": data.is_follow_up,
        "follow_up_of": data.follow_up_of,
    }

    update_fields["$push"] = {"answers": answer_record}
    if data.audio_features and question_type != "intro":
        update_fields.setdefault("$push", {})
        # Use $push for prosodic_scores separately
        await db.sessions.update_one(
            {"_id": data.session_id},
            {"$push": {"prosodic_scores": prosodic_score}},
        )

    await db.sessions.update_one(
        {"_id": data.session_id},
        {"$push": {"answers": answer_record}},
    )
    if update_fields.get("prosodic_baseline"):
        await db.sessions.update_one(
            {"_id": data.session_id},
            {"$set": {"prosodic_baseline": update_fields["prosodic_baseline"]}},
        )

    # ── Get Next Question ─────────────────────────────────────────────────────
    missed = eval_result.get("missed_keywords", [])
    last_q_dict = {
        "id": data.question_id,
        "question": question_text,
        "topic": topic,
    } if q_doc else None

    next_q, reason = await adaptive_engine.select_next_question(
        redis=redis,
        db=db,
        session_id=data.session_id,
        last_answer_score=composite,
        missed_keywords=missed if len(missed) >= 2 else [],
        last_question=last_q_dict,
    )

    session_complete = next_q is None
    if session_complete:
        await db.sessions.update_one(
            {"_id": data.session_id},
            {"$set": {"status": "completed", "completed_at": datetime.utcnow()}},
        )

    return SubmitAnswerResponse(
        evaluation={
            "keyword_score": eval_result["keyword_score"],
            "semantic_score": eval_result["semantic_score"],
            "llm_score": eval_result.get("llm_score", 5.0),
            "composite_score": composite,
            "matched_keywords": eval_result["matched_keywords"],
            "missed_keywords": eval_result["missed_keywords"],
            "feedback": eval_result.get("llm_feedback", ""),
            "correctness": eval_result.get("correctness", "partially_correct"),
        },
        next_question=_q_to_response(next_q) if next_q else None,
        session_complete=session_complete,
        message=reason,
    )


# ── Get Session ───────────────────────────────────────────────────────────────

@router.get("/{session_id}")
async def get_session(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    session = await db.sessions.find_one(
        {"_id": session_id, "user_id": current_user["_id"]}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session["id"] = session.pop("_id")
    return session


@router.get("/")
async def list_sessions(
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    sessions = await db.sessions.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(50)
    for s in sessions:
        s["id"] = s.pop("_id")
    return sessions
