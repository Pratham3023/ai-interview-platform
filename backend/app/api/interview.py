"""
Interview API Routes — Fixed 4-Phase Pattern

Phase 1: 15 General Aptitude MCQs  (same for all roles)  [NAVIGABLE]
Phase 2: 15 Role-based MCQs        (role-specific)        [NAVIGABLE]
Phase 3: 5  Adaptive open-ended Qs (role-based, difficulty adapts) [SEQUENTIAL]
Phase 4: 2  Coding questions       (write & execute code via Piston) [NAVIGABLE]

Total: 37 questions

Navigation model:
- Phase 1, 2, 4: All questions pre-loaded upfront; user can jump to any question freely
- Phase 3: Sequential only (adaptive difficulty depends on prior answers)
- Batch submission: Phase 1+2 answers collected locally then submitted when entering adaptive
                    Coding answers submitted individually (real-time execution)
"""

import uuid
import json
import random
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_mongo_db, get_redis
from app.api.auth import get_current_user
from app.services.nlp_evaluator import nlp_evaluator
from app.services.scoring_engine import scoring_engine
from app.services.piston_service import piston_service
from app.schemas import (
    StartInterviewRequest, StartInterviewResponse,
    SubmitAnswerRequest, SubmitAnswerResponse,
    QuestionResponse,
    BatchAnswerRequest, BatchAnswerResponse, SingleAnswerPayload,
)
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/interview", tags=["interview"])

# ── Constants ──────────────────────────────────────────────────────────────────

# Feature toggle: Coding evaluation temporarily paused for improvements (don't delete code)
ENABLE_CODING_PHASE = False

PHASE_ORDER  = ["aptitude_mcq", "role_mcq", "adaptive"] + (["coding"] if ENABLE_CODING_PHASE else [])
PHASE_SIZES  = {"aptitude_mcq": 15, "role_mcq": 15, "adaptive": 5, "coding": 2}
PHASE_LABELS = {
    "aptitude_mcq": "General Aptitude",
    "role_mcq":     "Role Knowledge",
    "adaptive":     "Technical Deep-Dive",
    "coding":       "Coding Challenge",
}
TOTAL_QUESTIONS = 35 if not ENABLE_CODING_PHASE else 37

# Navigable phases — questions delivered upfront; answers collected locally then batch-submitted
NAVIGABLE_PHASES = {"aptitude_mcq", "role_mcq"} | ({"coding"} if ENABLE_CODING_PHASE else set())

# Map job roles to question category stored in DB
ROLE_CATEGORY_MAP = {
    "software engineer":      "software_engineering",
    "backend developer":      "software_engineering",
    "full stack developer":   "software_engineering",
    "system design engineer": "software_engineering",
    "cloud engineer":         "devops",
    "frontend developer":     "frontend",
    "data scientist":         "data_science",
    "ml engineer":            "data_science",
    "machine learning engineer": "data_science",
    "data engineer":          "data_science",
    "devops engineer":        "devops",
}


def _role_to_category(job_role: str) -> str:
    return ROLE_CATEGORY_MAP.get(job_role.lower().strip(), "software_engineering")


# ── Redis helpers ──────────────────────────────────────────────────────────────

async def _save_state(redis, session_id: str, state: Dict) -> None:
    await redis.setex(f"session:{session_id}", settings.REDIS_SESSION_TTL, json.dumps(state))


async def _load_state(redis, session_id: str) -> Optional[Dict]:
    raw = await redis.get(f"session:{session_id}")
    return json.loads(raw) if raw else None


# ── Question builder helper ────────────────────────────────────────────────────

def _build_q_response(
    q: Dict,
    phase: str,
    q_in_phase: int,
    total_in_phase: int,
    overall_progress: int,
) -> QuestionResponse:
    return QuestionResponse(
        id=q["_id"],
        question=q["question"],
        topic=q.get("topic", "General"),
        subtopic=q.get("subtopic"),
        difficulty=q.get("difficulty", "medium"),
        type=q.get("type", phase),
        expected_keywords=q.get("expected_keywords", []),
        requires_code=q.get("requires_code", False),
        language_hint=q.get("language_hint"),
        options=q.get("options", []),        # MCQ options included; correct_option NEVER sent
        phase=phase,
        phase_label=PHASE_LABELS.get(phase, phase),
        q_in_phase=q_in_phase,
        total_in_phase=total_in_phase,
        overall_progress=overall_progress,
        test_cases=q.get("test_cases", []),
        starter_code=q.get("starter_code"),
        method_name=q.get("method_name"),
    )


ROLE_CATEGORY_TOPICS = {
    "software_engineering": ["OS", "OOP", "DBMS", "Computer Networks", "Java", "Python", "Web Development", "DSA", "FastAPI"],
    "devops": ["OS", "Computer Networks", "DBMS", "Python", "Web Development"],
    "frontend": ["Web Development", "DSA", "OOP"],
    "data_science": ["Machine Learning", "Python", "DBMS", "DSA", "MongoDB"],
}

# ── Pre-select all questions for a session ─────────────────────────────────────

async def _preselect_questions(db, role_category: str) -> Dict[str, List[str]]:
    """
    Randomly pick question IDs for all phases up front.
    Returns dict: {phase_name: [id, ...]}
    """

    async def pick(query: Dict, count: int) -> List[str]:
        try:
            pipeline = [{"$match": query}, {"$sample": {"size": count * 3}}, {"$project": {"_id": 1}}]
            docs = await db.questions.aggregate(pipeline).to_list(count * 3)
            ids = [d["_id"] for d in docs]
        except Exception:
            cursor = db.questions.find(query, {"_id": 1})
            docs = await cursor.to_list(count * 10)
            ids = [d["_id"] for d in docs]
        random.shuffle(ids)
        return ids[:count]

    aptitude_ids = await pick({"type": "aptitude_mcq"}, 15)
    role_mcq_ids = await pick({"type": "role_mcq", "role_category": role_category}, 15)
    # Fallback: if role doesn't have enough MCQs, pull from software_engineering
    if len(role_mcq_ids) < 15:
        extra = await pick({"type": "role_mcq", "role_category": "software_engineering"}, 15 - len(role_mcq_ids))
        role_mcq_ids += extra

    topics = ROLE_CATEGORY_TOPICS.get(role_category, ROLE_CATEGORY_TOPICS["software_engineering"])
    adaptive_ids = await pick({"type": "technical", "topic": {"$in": topics}}, 10)
    # Fallback for adaptive if not enough questions match the topic
    if len(adaptive_ids) < 5:
        extra = await pick({"type": "technical"}, 10 - len(adaptive_ids))
        adaptive_ids += extra

    if ENABLE_CODING_PHASE:
        coding_ids   = await pick({"type": "coding",    "role_category": role_category},  3)
        # Coding fallback
        if len(coding_ids) < 2:
            extra = await pick({"type": "coding", "role_category": "software_engineering"}, 2 - len(coding_ids))
            coding_ids += extra
    else:
        coding_ids = []

    return {
        "aptitude_mcq": aptitude_ids[:15],
        "role_mcq":     role_mcq_ids[:15],
        "adaptive":     adaptive_ids[:5],
        "coding":       coding_ids[:2] if ENABLE_CODING_PHASE else [],
    }


# ── Fetch all question docs for navigable phases ──────────────────────────────

async def _fetch_navigable_questions(db, selected: Dict[str, List[str]]) -> List[QuestionResponse]:
    """
    Fetch full question documents for all navigable phases (Phase 1, 2, and Coding if enabled)
    so they can be sent to the frontend at session start.
    Returns questions ordered: aptitude_mcqs (1-15), role_mcqs (1-15), [coding (1-2)].
    """
    all_qs: List[QuestionResponse] = []
    phases = ["aptitude_mcq", "role_mcq"] + (["coding"] if ENABLE_CODING_PHASE else [])

    for phase in phases:
        ids = selected.get(phase, [])
        total_in = PHASE_SIZES[phase]
        for idx, q_id in enumerate(ids):
            q_doc = await db.questions.find_one({"_id": q_id})
            if q_doc:
                all_qs.append(_build_q_response(q_doc, phase, idx + 1, total_in, 0))

    return all_qs


# ── Start Interview ────────────────────────────────────────────────────────────

@router.post("/start", response_model=StartInterviewResponse)
async def start_interview(
    data: StartInterviewRequest,
    db:   AsyncIOMotorDatabase = Depends(get_mongo_db),
    redis=Depends(get_redis),
    current_user=Depends(get_current_user),
):
    resume = await db.resumes.find_one({"_id": data.resume_id, "user_id": current_user["_id"]})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    role_category = _role_to_category(data.job_role)

    # Pre-select all question IDs
    selected = await _preselect_questions(db, role_category)
    if not selected["aptitude_mcq"]:
        raise HTTPException(status_code=422, detail="Question bank not seeded. Run seed_database.py first.")

    # Create MongoDB session document
    session_id = str(uuid.uuid4())
    session_doc = {
        "_id":            session_id,
        "user_id":        current_user["_id"],
        "resume_id":      data.resume_id,
        "job_role":       data.job_role,
        "role_category":  role_category,
        "status":         "active",
        "answers":        [],
        "overall_score":  0.0,
        "aptitude_score": 0.0, "aptitude_correct": 0,
        "role_mcq_score": 0.0, "role_mcq_correct": 0,
        "adaptive_score": 0.0,
        "coding_score":   0.0,
        "technical_score": 0.0,
        "topic_scores":   {}, "topic_statuses": {},
        "weak_topics":    [], "strong_topics": [],
        "created_at":     datetime.utcnow(),
        "completed_at":   None,
    }
    await db.sessions.insert_one(session_doc)

    # Store state in Redis
    state = {
        "session_id":    session_id,
        "job_role":      data.job_role,
        "role_category": role_category,
        "phase":         "aptitude_mcq",
        "phase_index":   0,
        "questions":     selected,    # {phase: [id, ...]}
        "adaptive_difficulty":      "easy",
        "adaptive_rolling_scores":  [],
        "questions_answered":       0,
        "submitted_phases":         [],
    }
    await _save_state(redis, session_id, state)

    # Fetch all navigable questions upfront (Phase 1 + Phase 2 + Coding)
    all_navigable = await _fetch_navigable_questions(db, selected)
    if not all_navigable:
        raise HTTPException(status_code=500, detail="Failed to load questions")

    return StartInterviewResponse(
        session_id=session_id,
        first_question=all_navigable[0],
        total_questions=TOTAL_QUESTIONS,
        message="Interview started! Navigate freely through MCQs and Coding questions.",
        all_navigable_questions=all_navigable,
    )


# ── Batch Answer Submission (Phase 1, 2, Coding) ──────────────────────────────

@router.post("/batch-answers", response_model=BatchAnswerResponse)
async def submit_batch_answers(
    data: BatchAnswerRequest,
    db:   AsyncIOMotorDatabase = Depends(get_mongo_db),
    redis=Depends(get_redis),
    current_user=Depends(get_current_user),
):
    """
    Accept all answers for a navigable phase in one shot.
    Called when the user clicks 'Finish MCQs & Continue' or submits coding answers.
    Idempotent per phase — re-submitting replaces previous answers for that phase.
    """
    session = await db.sessions.find_one({"_id": data.session_id, "user_id": current_user["_id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "active":
        return BatchAnswerResponse(
            phase=data.phase,
            submitted=0,
            next_phase="complete",
            next_phase_label="Complete",
            first_adaptive_question=None,
            session_complete=True,
            message="Session already completed",
        )

    state = await _load_state(redis, data.session_id)
    if not state:
        raise HTTPException(status_code=400, detail="Session state expired. Please start a new interview.")

    if data.phase not in NAVIGABLE_PHASES:
        raise HTTPException(status_code=400, detail=f"Phase '{data.phase}' is not a navigable phase.")

    # Score all submitted answers
    answer_records = []
    for ans in data.answers:
        q_doc = await db.questions.find_one({"_id": ans.question_id})
        if not q_doc:
            continue
        if data.phase in ("aptitude_mcq", "role_mcq"):
            record, _ = await _score_mcq_single(ans, q_doc, data.phase)
        else:  # coding
            record, _ = await _score_coding_single(ans, q_doc)
        answer_records.append(record)

    # Replace previous answers for this phase (allows answer changes before submission)
    await db.sessions.update_one(
        {"_id": data.session_id},
        {"$pull": {"answers": {"phase": data.phase}}},
    )
    if answer_records:
        await db.sessions.update_one(
            {"_id": data.session_id},
            {"$push": {"answers": {"$each": answer_records}}},
        )

    # Track submitted phases
    if data.phase not in state.get("submitted_phases", []):
        state.setdefault("submitted_phases", []).append(data.phase)

    # Determine what comes next
    next_phase = _next_server_phase(data.phase, state)
    next_phase_label = PHASE_LABELS.get(next_phase, next_phase)
    session_complete = False
    first_adaptive_q = None

    if next_phase == "adaptive":
        state["phase"] = "adaptive"
        state["phase_index"] = 0
        adaptive_ids = state["questions"].get("adaptive", [])
        if adaptive_ids:
            q_doc = await db.questions.find_one({"_id": adaptive_ids[0]})
            if q_doc:
                first_adaptive_q = _build_q_response(q_doc, "adaptive", 1, 5, 0)
        # Count MCQ answers as answered
        state["questions_answered"] = (
            len(state["questions"].get("aptitude_mcq", [])) +
            len(state["questions"].get("role_mcq", []))
        )
    elif next_phase == "coding":
        state["phase"] = "coding"
        state["phase_index"] = 0
    elif next_phase == "complete":
        session_complete = True
        await db.sessions.update_one(
            {"_id": data.session_id},
            {"$set": {"status": "completed", "completed_at": datetime.utcnow()}},
        )

    await _save_state(redis, data.session_id, state)

    return BatchAnswerResponse(
        phase=data.phase,
        submitted=len(answer_records),
        next_phase=next_phase,
        next_phase_label=next_phase_label,
        first_adaptive_question=first_adaptive_q,
        session_complete=session_complete,
        message=(
            "Interview complete!" if session_complete
            else f"{PHASE_LABELS.get(data.phase, data.phase)} submitted → {next_phase_label}"
        ),
    )


def _next_server_phase(current_phase: str, state: Dict) -> str:
    """Determine the next server phase after submitting a navigable phase batch."""
    submitted = set(state.get("submitted_phases", []))
    submitted.add(current_phase)

    mcq_done = "aptitude_mcq" in submitted and "role_mcq" in submitted
    adaptive_done = "adaptive" in submitted
    coding_done = "coding" in submitted

    if not mcq_done:
        # Still waiting for the other MCQ phase
        return "role_mcq" if current_phase == "aptitude_mcq" else "aptitude_mcq"
    if not adaptive_done:
        return "adaptive"
    if ENABLE_CODING_PHASE and not coding_done:
        return "coding"
    return "complete"


# ── Submit Answer (Adaptive phase — sequential) ─────────────────────────────────────────

@router.post("/answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    data: SubmitAnswerRequest,
    db:   AsyncIOMotorDatabase = Depends(get_mongo_db),
    redis=Depends(get_redis),
    current_user=Depends(get_current_user),
):
    session = await db.sessions.find_one({"_id": data.session_id, "user_id": current_user["_id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "active":
        return SubmitAnswerResponse(
            evaluation={"status": "completed"},
            next_question=None,
            session_complete=True,
            message="Session already completed",
            phase="complete",
            phase_label="Complete",
            overall_progress=len(session.get("answers", [])),
        )

    state = await _load_state(redis, data.session_id)
    if not state:
        raise HTTPException(status_code=400, detail="Session state expired. Please start a new interview.")

    phase       = state["phase"]
    phase_index = state["phase_index"]
    q_id        = data.question_id

    # Fetch question doc
    q_doc = await db.questions.find_one({"_id": q_id})

    # ── Build answer record based on phase ────────────────────────────────────
    if phase in ("aptitude_mcq", "role_mcq"):
        answer_record, evaluation = await _score_mcq(data, q_doc, phase)
    elif phase == "adaptive":
        answer_record, evaluation = await _score_adaptive(data, q_doc, state)
        # Update adaptive difficulty
        last_composite = answer_record.get("composite_score", 5.0)
        state["adaptive_rolling_scores"].append(last_composite)
        if len(state["adaptive_rolling_scores"]) > 3:
            state["adaptive_rolling_scores"] = state["adaptive_rolling_scores"][-3:]
        avg = sum(state["adaptive_rolling_scores"]) / len(state["adaptive_rolling_scores"])
        if avg >= 7.5:
            state["adaptive_difficulty"] = "hard"
        elif avg >= 5.0:
            state["adaptive_difficulty"] = "medium"
        else:
            state["adaptive_difficulty"] = "easy"
    else:  # coding
        answer_record, evaluation = await _score_coding(data, q_doc, phase)

    # ── Persist answer ────────────────────────────────────────────────────────
    await db.sessions.update_one(
        {"_id": data.session_id},
        {"$push": {"answers": answer_record}},
    )

    # ── Advance to next question ───────────────────────────────────────────────
    state["phase_index"]        += 1
    state["questions_answered"] += 1
    next_q, next_phase = await _get_next_question(db, state)

    # Update state
    state["phase"] = next_phase if next_q else "complete"
    await _save_state(redis, data.session_id, state)

    # ── Session complete ───────────────────────────────────────────────────────
    session_complete = next_q is None
    if session_complete:
        await db.sessions.update_one(
            {"_id": data.session_id},
            {"$set": {"status": "completed", "completed_at": datetime.utcnow()}},
        )

    return SubmitAnswerResponse(
        evaluation=evaluation,
        next_question=next_q,
        session_complete=session_complete,
        message=f"Phase transition → {PHASE_LABELS.get(next_phase, '')}" if next_q and next_phase != phase else "",
        phase=next_phase or phase,
        phase_label=PHASE_LABELS.get(next_phase or phase, ""),
        overall_progress=state["questions_answered"],
    )


# ── Phase Scoring Helpers ──────────────────────────────────────────────────

async def _score_mcq_single(
    data: SingleAnswerPayload,
    q_doc: Optional[Dict],
    phase: str,
) -> tuple:
    """Score a single MCQ answer silently (correct_option never exposed to caller)."""
    correct_option = q_doc.get("correct_option") if q_doc else None
    selected       = (data.selected_option or "").strip().upper()
    is_correct     = bool(selected and correct_option and selected == correct_option.upper())
    composite      = 10.0 if is_correct else 0.0

    answer_record = {
        "question_id":    data.question_id,
        "question_text":  q_doc.get("question", "") if q_doc else "",
        "topic":          q_doc.get("topic", "General") if q_doc else "General",
        "difficulty":     q_doc.get("difficulty", "medium") if q_doc else "medium",
        "question_type":  phase,
        "phase":          phase,
        "answer_text":    selected,
        "selected_option": selected,
        "correct_option":  correct_option,  # stored in DB, NOT returned to frontend
        "is_correct":      is_correct,
        "composite_score": composite,
        "keyword_score":   0.0,
        "semantic_score":  0.0,
        "llm_score":       0.0,
        "coding_score":    0.0,
        "matched_keywords": [],
        "missed_keywords":  [],
        "answered_at":     datetime.utcnow(),
    }
    # Evaluation dict returned to frontend: NO correct_option, NO is_correct
    evaluation = {
        "type":     "mcq",
        "answered": True,
    }
    return answer_record, evaluation


async def _score_mcq(
    data: SubmitAnswerRequest,
    q_doc: Optional[Dict],
    phase: str,
) -> tuple:
    """Legacy wrapper: score an MCQ from a SubmitAnswerRequest."""
    payload = SingleAnswerPayload(
        question_id=data.question_id,
        answer_text=data.answer_text,
        selected_option=data.selected_option,
    )
    return await _score_mcq_single(payload, q_doc, phase)


async def _score_adaptive(
    data: SubmitAnswerRequest,
    q_doc: Optional[Dict],
    state: Dict,
) -> tuple:
    """NLP-evaluate an adaptive open-ended answer."""
    expected_keywords = q_doc.get("expected_keywords", []) if q_doc else []
    ideal_answer      = q_doc.get("ideal_answer", "")      if q_doc else ""
    topic             = q_doc.get("topic", "General")       if q_doc else "General"
    question_text     = q_doc.get("question", "")           if q_doc else ""

    eval_result = await nlp_evaluator.evaluate_answer_full(
        question=question_text,
        answer=data.answer_text,
        topic=topic,
        expected_keywords=expected_keywords,
        ideal_answer=ideal_answer,
        use_llm=False,
    )

    composite = scoring_engine.compute_composite_score(
        keyword_score=eval_result["keyword_score"],
        semantic_score=eval_result["semantic_score"],
        llm_score=eval_result.get("llm_score", eval_result["keyword_score"]),
    )

    answer_record = {
        "question_id":    data.question_id,
        "question_text":  question_text,
        "topic":          topic,
        "difficulty":     q_doc.get("difficulty", "medium") if q_doc else state.get("adaptive_difficulty", "medium"),
        "question_type":  "technical",
        "phase":          "adaptive",
        "answer_text":    data.answer_text,
        "selected_option": None,
        "correct_option":  None,
        "is_correct":      None,
        "keyword_score":   eval_result["keyword_score"],
        "semantic_score":  eval_result["semantic_score"],
        "llm_score":       eval_result.get("llm_score", 5.0),
        "coding_score":    0.0,
        "composite_score": composite,
        "matched_keywords": eval_result.get("matched_keywords", []),
        "missed_keywords":  eval_result.get("missed_keywords", []),
        "answered_at":     datetime.utcnow(),
    }
    evaluation = {
        "type":             "adaptive",
        "keyword_score":    eval_result["keyword_score"],
        "semantic_score":   eval_result["semantic_score"],
        "composite_score":  composite,
        "matched_keywords": eval_result.get("matched_keywords", []),
        "missed_keywords":  eval_result.get("missed_keywords", []),
    }
    return answer_record, evaluation


async def _score_coding_single(
    data: SingleAnswerPayload,
    q_doc: Optional[Dict],
) -> tuple:
    """Run code via Piston and score (single coding question)."""
    language = data.language or "python"
    result   = await piston_service.submit_and_wait(
        source_code=data.answer_text,
        language=language,
        stdin="",
    )
    coding_score_10 = piston_service.calculate_coding_score(result)

    answer_record = {
        "question_id":    data.question_id,
        "question_text":  q_doc.get("question", "") if q_doc else "",
        "topic":          q_doc.get("topic", "Coding") if q_doc else "Coding",
        "difficulty":     q_doc.get("difficulty", "medium") if q_doc else "medium",
        "question_type":  "coding",
        "phase":          "coding",
        "answer_text":    data.answer_text[:2000],
        "selected_option": None,
        "correct_option":  None,
        "is_correct":      None,
        "keyword_score":   0.0,
        "semantic_score":  0.0,
        "llm_score":       0.0,
        "coding_score":    coding_score_10,
        "composite_score": coding_score_10,
        "matched_keywords": [],
        "missed_keywords":  [],
        "code_submission": data.answer_text[:2000],
        "code_language":   language,
        "piston_result":   result,
        "answered_at":     datetime.utcnow(),
    }
    evaluation = {
        "type":          "coding",
        "status":        result.get("verdict", ""),
        "stdout":        result.get("stdout", ""),
        "stderr":        result.get("stderr", ""),
        "compile_output": result.get("compile_output", ""),
        "coding_score":  coding_score_10,
        "accepted":      result.get("accepted", False),
    }
    return answer_record, evaluation


async def _score_coding(
    data: SubmitAnswerRequest,
    q_doc: Optional[Dict],
    phase: str,
) -> tuple:
    """Legacy wrapper: run code via Piston from a SubmitAnswerRequest."""
    payload = SingleAnswerPayload(
        question_id=data.question_id,
        answer_text=data.answer_text,
        language=data.language,
    )
    return await _score_coding_single(payload, q_doc)


# ── Next Question Logic ────────────────────────────────────────────────────────

async def _get_next_question(
    db,
    state: Dict,
) -> tuple:
    """
    Determine the next question given the updated state (phase_index already incremented).
    Returns (QuestionResponse | None, phase_str).
    """
    phase         = state["phase"]
    phase_index   = state["phase_index"]
    questions     = state["questions"]    # {phase: [id, ...]}
    q_answered    = state["questions_answered"]

    # Try current phase first
    ids = questions.get(phase, [])
    if phase_index < len(ids):
        q_doc = await db.questions.find_one({"_id": ids[phase_index]})
        if q_doc:
            total_in = PHASE_SIZES[phase]
            return _build_q_response(q_doc, phase, phase_index + 1, total_in, q_answered), phase

    # Advance to next phase (skip navigable phases — they are handled via /batch-answers)
    current_idx = PHASE_ORDER.index(phase) if phase in PHASE_ORDER else -1
    for next_phase in PHASE_ORDER[current_idx + 1:]:
        if next_phase in NAVIGABLE_PHASES:
            continue  # navigable phases are submitted via /batch-answers
        state["phase"]       = next_phase
        state["phase_index"] = 0
        next_ids = questions.get(next_phase, [])
        if next_ids:
            q_doc = await db.questions.find_one({"_id": next_ids[0]})
            if q_doc:
                total_in = PHASE_SIZES[next_phase]
                return _build_q_response(q_doc, next_phase, 1, total_in, q_answered), next_phase

    return None, "complete"


# ── Get Session ────────────────────────────────────────────────────────────────

@router.get("/{session_id}")
async def get_session(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    session = await db.sessions.find_one({"_id": session_id, "user_id": current_user["_id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session["id"] = session.pop("_id")
    # Strip correct_option from answers before returning
    for ans in session.get("answers", []):
        ans.pop("correct_option", None)
    return session


@router.get("")
@router.get("/")
async def list_sessions(
    skip: int = 0,
    limit: int = 50,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    sessions = await db.sessions.find({"user_id": current_user["_id"]}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for s in sessions:
        s["id"] = s.pop("_id")
    return sessions



