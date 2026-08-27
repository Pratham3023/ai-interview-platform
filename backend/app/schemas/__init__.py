"""
API Request/Response Schemas (Pydantic v2)
"""

from datetime import datetime
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, EmailStr, Field


# ── Auth ─────────────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=2)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
    email: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime


# ── Resume ────────────────────────────────────────────────────────────────────

class SkillProfileResponse(BaseModel):
    resume_id: str
    filename: str
    skill_profile: Dict[str, List[str]]
    all_skills: List[str]
    total_skills_detected: int


# ── Interview ─────────────────────────────────────────────────────────────────

class StartInterviewRequest(BaseModel):
    resume_id: str
    job_role: str = "Software Engineer"


class QuestionResponse(BaseModel):
    id: str
    question: str
    topic: str
    subtopic: Optional[str] = None
    difficulty: str
    type: str
    expected_keywords: List[str] = []
    requires_code: bool = False
    language_hint: Optional[str] = None


class StartInterviewResponse(BaseModel):
    session_id: str
    first_question: QuestionResponse
    message: str = "Interview started"


class SubmitAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer_text: str
    is_follow_up: bool = False
    follow_up_of: Optional[str] = None
    audio_features: Optional[Dict[str, Any]] = None


class SubmitAnswerResponse(BaseModel):
    evaluation: Dict[str, Any]
    next_question: Optional[QuestionResponse]
    session_complete: bool
    message: str = ""


# ── Coding ────────────────────────────────────────────────────────────────────

class CodeSubmitRequest(BaseModel):
    session_id: str
    question_id: str
    code: str
    language_id: int
    stdin: Optional[str] = ""


class CodeSubmitResponse(BaseModel):
    status: str
    stdout: Optional[str] = ""
    stderr: Optional[str] = ""
    compile_output: Optional[str] = ""
    time: Optional[str] = None
    memory: Optional[int] = None
    coding_score: float
    message: str


# ── Scoring ───────────────────────────────────────────────────────────────────

class ScoreResponse(BaseModel):
    session_id: str
    overall_score: float
    technical_score: float
    coding_score: float
    communication_score: float
    confidence_indicator: float
    answer_quality_score: float
    keyword_coverage_score: float
    topic_scores: Dict[str, float] = {}
    topic_statuses: Dict[str, str] = {}
    weak_topics: List[str] = []
    strong_topics: List[str] = []


# ── Feedback ──────────────────────────────────────────────────────────────────

class FeedbackResponse(BaseModel):
    feedback_id: str
    session_id: str
    overall_summary: str
    strengths: List[str]
    weaknesses: List[str]
    technical_feedback: str
    communication_feedback: str
    improvement_suggestions: List[str]
    generated_at: datetime


# ── Roadmap ───────────────────────────────────────────────────────────────────

class DailyTaskSchema(BaseModel):
    day: int
    task: str
    resource_url: Optional[str] = None
    resource_type: str = "article"


class WeekPlanSchema(BaseModel):
    week: int
    topic: str
    focus: str
    severity: str
    daily_tasks: List[DailyTaskSchema] = []


class RoadmapResponse(BaseModel):
    roadmap_id: str
    session_id: str
    job_role: str
    weak_topics: List[str]
    weeks: List[WeekPlanSchema]
    total_weeks: int
    generated_at: datetime


# ── Dashboard ─────────────────────────────────────────────────────────────────

class SessionSummary(BaseModel):
    session_id: str
    job_role: str
    overall_score: float
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    weak_topics: List[str] = []


class DashboardResponse(BaseModel):
    user: UserResponse
    total_sessions: int
    latest_session: Optional[SessionSummary]
    all_sessions: List[SessionSummary]
    best_score: float
    average_score: float
    most_improved_topic: Optional[str] = None
