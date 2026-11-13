"""
Data Models — MongoDB document structures (Pydantic v2)
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class Difficulty(str, Enum):
    EASY   = "easy"
    MEDIUM = "medium"
    HARD   = "hard"


class QuestionType(str, Enum):
    APTITUDE_MCQ = "aptitude_mcq"  # Phase 1 — general aptitude, all roles
    ROLE_MCQ     = "role_mcq"      # Phase 2 — role-specific MCQs
    TECHNICAL    = "technical"     # Phase 3 — adaptive open-ended
    CODING       = "coding"        # Phase 4 — write & execute code


class SessionStatus(str, Enum):
    ACTIVE    = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class TopicStatus(str, Enum):
    STRONG            = "strong"
    NEEDS_IMPROVEMENT = "needs_improvement"
    WEAK              = "weak"


# ── Question ──────────────────────────────────────────────────────────────────

class QuestionModel(BaseModel):
    id:                Optional[str]  = Field(default=None, alias="_id")
    question:          str
    topic:             str
    subtopic:          Optional[str]  = None
    difficulty:        Difficulty
    type:              QuestionType
    role_category:     str            = "general"   # general | software_engineering | frontend | data_science | devops
    options:           List[str]      = []           # MCQ only: ["A) ...", "B) ...", "C) ...", "D) ..."]
    correct_option:    Optional[str]  = None         # MCQ only: "A" | "B" | "C" | "D"
    expected_keywords: List[str]      = []           # Adaptive open-ended only
    requires_code:     bool           = False
    language_hint:     Optional[str]  = None
    ideal_answer:      Optional[str]  = None
    tags:              List[str]      = []

    class Config:
        populate_by_name = True


# ── Answer Record ─────────────────────────────────────────────────────────────

class AnswerRecord(BaseModel):
    question_id:      str
    question_text:    str
    topic:            str
    difficulty:       str
    question_type:    str                       # aptitude_mcq | role_mcq | technical | coding
    phase:            str            = ""       # aptitude_mcq | role_mcq | adaptive | coding
    answer_text:      str
    selected_option:  Optional[str]  = None     # MCQ: "A" | "B" | "C" | "D"
    correct_option:   Optional[str]  = None     # MCQ: stored but NOT sent to frontend during session
    is_correct:       Optional[bool] = None     # MCQ: computed silently
    keyword_score:    float          = 0.0
    semantic_score:   float          = 0.0
    llm_score:        float          = 0.0
    coding_score:     float          = 0.0
    composite_score:  float          = 0.0      # 0–10
    matched_keywords: List[str]      = []
    missed_keywords:  List[str]      = []
    code_submission:  Optional[str]  = None
    code_language:    Optional[str]  = None
    piston_result:    Optional[Dict[str, Any]] = None
    answered_at:      datetime       = Field(default_factory=datetime.utcnow)


# ── Session ───────────────────────────────────────────────────────────────────

class SessionModel(BaseModel):
    id:                     Optional[str]       = Field(default=None, alias="_id")
    user_id:                str
    resume_id:              str
    job_role:               str
    role_category:          str                 = "software_engineering"
    status:                 SessionStatus       = SessionStatus.ACTIVE
    answers:                List[AnswerRecord]  = []

    # Phase scores (0–100 scale)
    aptitude_score:         float               = 0.0
    aptitude_correct:       int                 = 0
    role_mcq_score:         float               = 0.0
    role_mcq_correct:       int                 = 0
    adaptive_score:         float               = 0.0
    coding_score:           float               = 0.0

    # Derived / legacy fields
    overall_score:          float               = 0.0
    technical_score:        float               = 0.0   # alias for adaptive_score
    communication_score:    float               = 0.0
    confidence_indicator:   float               = 0.0
    answer_quality_score:   float               = 0.0
    keyword_coverage_score: float               = 0.0

    topic_scores:           Dict[str, float]    = {}
    topic_statuses:         Dict[str, str]      = {}
    weak_topics:            List[str]           = []
    strong_topics:          List[str]           = []

    created_at:             datetime            = Field(default_factory=datetime.utcnow)
    completed_at:           Optional[datetime]  = None

    class Config:
        populate_by_name = True


# ── Roadmap ───────────────────────────────────────────────────────────────────

class DailyTask(BaseModel):
    day:           int
    task:          str
    resource_url:  Optional[str] = None
    resource_type: str           = "article"


class WeekPlan(BaseModel):
    week:        int
    topic:       str
    focus:       str
    severity:    str
    daily_tasks: List[DailyTask] = []


class RoadmapModel(BaseModel):
    id:           Optional[str] = Field(default=None, alias="_id")
    session_id:   str
    user_id:      str
    job_role:     str
    weak_topics:  List[str]    = []
    weeks:        List[WeekPlan] = []
    total_weeks:  int          = 0
    generated_at: datetime     = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
