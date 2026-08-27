"""
Adaptive Interview Engine
The CORE of the system — manages the complete interview session lifecycle.

Algorithm:
1. Start with "Introduce Yourself" (confidence baselining)
2. Select domain-specific questions from candidate's skill profile
3. Adapt difficulty based on rolling score
4. Generate keyword-based follow-up questions via Gemini
5. Track session state in Redis
"""

import json
import logging
import random
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime

from app.config import settings
from app.models import QuestionModel, SessionModel, Difficulty, QuestionType
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)

# ── Difficulty Progression ────────────────────────────────────────────────────

DIFFICULTY_ORDER = {Difficulty.EASY: 0, Difficulty.MEDIUM: 1, Difficulty.HARD: 2}
DIFFICULTY_FROM_IDX = {0: Difficulty.EASY, 1: Difficulty.MEDIUM, 2: Difficulty.HARD}


class AdaptiveInterviewEngine:
    """
    Manages adaptive question selection and follow-up generation.
    Session state is persisted in Redis.
    """

    # ── Session Initialization ───────────────────────────────────────────────

    async def create_session_state(
        self,
        redis,
        session_id: str,
        skill_profile: Dict[str, List[str]],
        job_role: str,
    ) -> None:
        """Initialize Redis session state."""
        state = {
            "session_id": session_id,
            "job_role": job_role,
            "skill_topics": list(skill_profile.keys()),
            "current_difficulty": Difficulty.EASY.value,
            "question_count": 0,
            "total_questions": settings.MAX_QUESTIONS_PER_SESSION,
            "rolling_scores": [],           # last N scores for difficulty adjustment
            "covered_topics": [],           # topics already asked
            "covered_question_ids": [],     # to prevent repeats
            "phase": "intro",               # intro | technical | coding | complete
            "pending_followup": None,       # serialized follow-up question or None
            "last_missed_keywords": [],
            "topic_question_counts": {},    # {topic: count}
        }
        await redis.setex(
            f"session:{session_id}",
            settings.REDIS_SESSION_TTL,
            json.dumps(state),
        )

    async def get_session_state(self, redis, session_id: str) -> Optional[Dict]:
        raw = await redis.get(f"session:{session_id}")
        return json.loads(raw) if raw else None

    async def update_session_state(self, redis, session_id: str, state: Dict) -> None:
        await redis.setex(
            f"session:{session_id}",
            settings.REDIS_SESSION_TTL,
            json.dumps(state),
        )

    # ── Intro Question ───────────────────────────────────────────────────────

    def get_intro_question(self) -> Dict[str, Any]:
        """Return the fixed "Introduce Yourself" question."""
        return {
            "id": "intro_001",
            "question": (
                "Please introduce yourself. Tell me about your background, "
                "your technical skills, and what you're looking to achieve in your career."
            ),
            "topic": "Introduction",
            "subtopic": "Self Introduction",
            "difficulty": "easy",
            "type": "intro",
            "expected_keywords": ["skills", "experience", "projects", "goals"],
            "requires_code": False,
            "language_hint": None,
        }

    # ── Question Selection ───────────────────────────────────────────────────

    async def select_next_question(
        self,
        redis,
        db,
        session_id: str,
        last_answer_score: Optional[float] = None,
        missed_keywords: Optional[List[str]] = None,
        last_question: Optional[Dict] = None,
    ) -> Tuple[Optional[Dict], str]:
        """
        Select the next question adaptively.

        Returns: (question_dict, reason)
        Returns (None, reason) when session is complete.
        """
        state = await self.get_session_state(redis, session_id)
        if not state:
            return None, "Session expired"

        # ── Check completion ─────────────────────────────────────────────────
        if state["question_count"] >= state["total_questions"]:
            return None, "Interview complete"

        # ── Update difficulty based on last score ────────────────────────────
        if last_answer_score is not None:
            state["rolling_scores"].append(last_answer_score)
            if len(state["rolling_scores"]) > 2:
                state["rolling_scores"] = state["rolling_scores"][-2:]
            state["current_difficulty"] = self._adjust_difficulty(
                state["current_difficulty"],
                state["rolling_scores"],
            )

        # ── Check for pending follow-up ───────────────────────────────────────
        if state.get("pending_followup") and missed_keywords:
            followup = state["pending_followup"]
            state["pending_followup"] = None
            state["question_count"] += 1
            await self.update_session_state(redis, session_id, state)
            return followup, "follow_up"

        # ── Generate follow-up if keywords were missed ───────────────────────
        if (
            missed_keywords
            and last_question
            and len(missed_keywords) >= 2
            and state["question_count"] < state["total_questions"] - 1
        ):
            followup_text = await gemini_service.generate_followup_question(
                original_question=last_question.get("question", ""),
                candidate_answer="",
                missed_keywords=missed_keywords,
                topic=last_question.get("topic", "General"),
            )
            if followup_text:
                followup_q = {
                    "id": f"followup_{state['question_count']}",
                    "question": followup_text,
                    "topic": last_question.get("topic", "General"),
                    "subtopic": "Follow-up",
                    "difficulty": state["current_difficulty"],
                    "type": "technical",
                    "expected_keywords": missed_keywords,
                    "requires_code": False,
                    "language_hint": None,
                    "is_follow_up": True,
                }
                state["pending_followup"] = followup_q
                # Don't return the follow-up yet — return a normal question first
                # Actually for adaptive flow, return follow-up immediately
                state["question_count"] += 1
                state["last_missed_keywords"] = []
                await self.update_session_state(redis, session_id, state)
                return followup_q, "follow_up"

        # ── Decide whether to include a coding question ───────────────────────
        q_count = state["question_count"]
        skill_topics = state["skill_topics"]
        covered_ids = set(state["covered_question_ids"])

        # Insert a coding question around the midpoint of the session
        use_coding = (
            q_count == state["total_questions"] // 2
            and state["phase"] != "coding"
        )

        if use_coding:
            q = await self._fetch_question(
                db,
                topics=skill_topics,
                difficulty=state["current_difficulty"],
                q_type=QuestionType.CODING.value,
                exclude_ids=covered_ids,
            )
            if q:
                state["phase"] = "coding"
                state["covered_question_ids"].append(q["id"])
                state["question_count"] += 1
                await self.update_session_state(redis, session_id, state)
                return q, "coding_challenge"

        # ── Select a technical question ───────────────────────────────────────
        # Prioritize topics not yet covered, then rotate
        uncovered = [t for t in skill_topics if t not in state["covered_topics"]]
        target_topics = uncovered if uncovered else skill_topics

        q = await self._fetch_question(
            db,
            topics=target_topics,
            difficulty=state["current_difficulty"],
            q_type=QuestionType.TECHNICAL.value,
            exclude_ids=covered_ids,
        )

        if not q:
            # Widen search to any topic
            q = await self._fetch_question(
                db,
                topics=skill_topics,
                difficulty=state["current_difficulty"],
                q_type=QuestionType.TECHNICAL.value,
                exclude_ids=covered_ids,
            )

        if q:
            if q["topic"] not in state["covered_topics"]:
                state["covered_topics"].append(q["topic"])
            state["covered_question_ids"].append(q["id"])
            state["question_count"] += 1
            tc = state["topic_question_counts"]
            tc[q["topic"]] = tc.get(q["topic"], 0) + 1
            state["topic_question_counts"] = tc
            state["phase"] = "technical"
            await self.update_session_state(redis, session_id, state)
            return q, "technical"

        # No question found — session complete
        return None, "No more questions available"

    async def _fetch_question(
        self,
        db,
        topics: List[str],
        difficulty: str,
        q_type: str,
        exclude_ids: set,
    ) -> Optional[Dict]:
        """Fetch a random question from MongoDB matching criteria."""
        query: Dict[str, Any] = {
            "topic": {"$in": topics},
            "difficulty": difficulty,
            "type": q_type,
        }
        if exclude_ids:
            query["_id"] = {"$nin": list(exclude_ids)}

        cursor = db.questions.aggregate([
            {"$match": query},
            {"$sample": {"size": 1}},
        ])
        doc = await cursor.to_list(length=1)
        if doc:
            return self._doc_to_dict(doc[0])

        # Fallback: try medium difficulty
        if difficulty != Difficulty.MEDIUM.value:
            query["difficulty"] = Difficulty.MEDIUM.value
            cursor = db.questions.aggregate([
                {"$match": query},
                {"$sample": {"size": 1}},
            ])
            doc = await cursor.to_list(length=1)
            if doc:
                return self._doc_to_dict(doc[0])
        return None

    def _doc_to_dict(self, doc: Dict) -> Dict:
        return {
            "id": str(doc.get("_id", "")),
            "question": doc.get("question", ""),
            "topic": doc.get("topic", ""),
            "subtopic": doc.get("subtopic"),
            "difficulty": doc.get("difficulty", "medium"),
            "type": doc.get("type", "technical"),
            "expected_keywords": doc.get("expected_keywords", []),
            "requires_code": doc.get("requires_code", False),
            "language_hint": doc.get("language_hint"),
            "ideal_answer": doc.get("ideal_answer", ""),
        }

    # ── Difficulty Adjustment ────────────────────────────────────────────────

    def _adjust_difficulty(self, current: str, rolling_scores: List[float]) -> str:
        """
        If avg of last 2 scores > 7.5 → increase difficulty
        If avg of last 2 scores < 4.0 → decrease difficulty
        """
        if not rolling_scores:
            return current

        avg = sum(rolling_scores) / len(rolling_scores)
        idx = {Difficulty.EASY.value: 0, Difficulty.MEDIUM.value: 1, Difficulty.HARD.value: 2}.get(current, 1)

        if avg > 7.5 and idx < 2:
            idx += 1
        elif avg < 4.0 and idx > 0:
            idx -= 1

        return [Difficulty.EASY.value, Difficulty.MEDIUM.value, Difficulty.HARD.value][idx]


# Singleton
adaptive_engine = AdaptiveInterviewEngine()
