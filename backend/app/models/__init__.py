"""
Data Models — MongoDB document structures (Pydantic v2)
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class QuestionType(str, Enum):
    INTRO = "intro"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    CODING = "coding"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class TopicStatus(str, Enum):
    STRONG = "strong"
    NEEDS_IMPROVEMENT = "needs_improvement"
    WEAK = "weak"


# ── Question ──────────────────────────────────────────────────────────────────

class QuestionModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    question: str
    topic: str
    subtopic: Optional[str] = None
    difficulty: Difficulty
    type: QuestionType
    expected_keywords: List[str] = []
    requires_code: bool = False
    language_hint: Optional[str] = None
    ideal_answer: Optional[str] = None
    tags: List[str] = []

    class Config:
        populate_by_name = True


# ── Answer Record ─────────────────────────────────────────────────────────────

class AnswerRecord(BaseModel):
    question_id: str
    question_text: str
    topic: str
    difficulty: str
    question_type: str
    answer_text: str
    keyword_score: float = 0.0
    semantic_score: float = 0.0
    llm_score: float = 0.0
    coding_score: float = 0.0
    composite_score: float = 0.0
    matched_keywords: List[str] = []
    missed_keywords: List[str] = []
    code_submission: Optional[str] = None
    code_language: Optional[str] = None
    judge0_result: Optional[Dict[str, Any]] = None
    answered_at: datetime = Field(default_factory=datetime.utcnow)
    is_follow_up: bool = False
    follow_up_of: Optional[str] = None


# ── Session ───────────────────────────────────────────────────────────────────

class SessionModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    resume_id: str
    job_role: str
    status: SessionStatus = SessionStatus.ACTIVE
    answers: List[AnswerRecord] = []
    topic_scores: Dict[str, float] = {}
    topic_statuses: Dict[str, str] = {}
    weak_topics: List[str] = []
    strong_topics: List[str] = []
    overall_score: float = 0.0
    technical_score: float = 0.0
    coding_score: float = 0.0
    communication_score: float = 0.0
    confidence_indicator: float = 0.0
    answer_quality_score: float = 0.0
    keyword_coverage_score: float = 0.0
    prosodic_baseline: Optional[Dict[str, Any]] = None
    prosodic_scores: List[float] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    class Config:
        populate_by_name = True


# ── Roadmap ───────────────────────────────────────────────────────────────────

class DailyTask(BaseModel):
    day: int
    task: str
    resource_url: Optional[str] = None
    resource_type: str = "article"


class WeekPlan(BaseModel):
    week: int
    topic: str
    focus: str
    severity: str
    daily_tasks: List[DailyTask] = []


class RoadmapModel(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    session_id: str
    user_id: str
    job_role: str
    weak_topics: List[str] = []
    weeks: List[WeekPlan] = []
    total_weeks: int = 0
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
