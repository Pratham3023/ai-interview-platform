"""
Feedback Engine
Generates personalized AI feedback from session data using Gemini.
"""

import logging
from typing import Dict, Any, List

from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


class FeedbackEngine:

    async def generate(self, session: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate full feedback report from a session document.
        Falls back to rule-based feedback if Gemini is unavailable.
        """
        answers = session.get("answers", [])
        topic_scores = session.get("topic_scores", {})
        weak_topics = session.get("weak_topics", [])
        strong_topics = session.get("strong_topics", [])
        overall_score = session.get("overall_score", 0.0)
        job_role = session.get("job_role", "Software Engineer")

        # Build answer summary for Gemini context
        answers_summary = [
            {
                "topic": a.get("topic"),
                "question": a.get("question_text", "")[:100],
                "matched_keywords": a.get("matched_keywords", []),
                "missed_keywords": a.get("missed_keywords", []),
                "composite_score": a.get("composite_score", 0),
            }
            for a in answers[:8]  # limit to first 8 for prompt length
        ]

        session_data = {
            "job_role": job_role,
            "overall_score": overall_score,
            "topic_scores": topic_scores,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "answers_summary": answers_summary,
        }

        try:
            feedback = await gemini_service.generate_feedback_report(session_data)
            return feedback
        except Exception as e:
            logger.warning("Gemini feedback failed, using rule-based: %s", e)
            return self._rule_based_feedback(topic_scores, weak_topics, strong_topics, overall_score)

    def _rule_based_feedback(
        self,
        topic_scores: Dict[str, float],
        weak_topics: List[str],
        strong_topics: List[str],
        overall_score: float,
    ) -> Dict[str, Any]:
        """Deterministic fallback when LLM is unavailable."""
        performance = "excellent" if overall_score >= 85 else "good" if overall_score >= 70 else "fair" if overall_score >= 55 else "needs improvement"

        sorted_scores = sorted(topic_scores.items(), key=lambda x: x[1], reverse=True)
        top_topics = [t for t, _ in sorted_scores[:3]]
        low_topics = [t for t, _ in sorted_scores[-3:] if _ < 75]

        return {
            "overall_summary": (
                f"Your overall performance was {performance} with a score of {overall_score:.1f}/100. "
                f"{'You demonstrated strong technical knowledge overall.' if overall_score >= 70 else 'There are several areas that need focused study before your next interview.'}"
            ),
            "strengths": [
                f"Solid understanding of {t}" for t in (strong_topics[:3] or top_topics[:3] or ["General CS concepts"])
            ],
            "weaknesses": [
                f"Limited depth in {t}" for t in (weak_topics[:3] or low_topics[:3] or ["Some advanced topics"])
            ],
            "technical_feedback": (
                f"Your technical responses showed {'strong' if overall_score >= 70 else 'developing'} knowledge. "
                f"{'Focus on deepening your understanding of ' + ', '.join(weak_topics[:2]) if weak_topics else 'Continue building on your existing strengths.'}"
            ),
            "communication_feedback": (
                "Your answers were structured and relevant. "
                "Consider providing more concrete examples from your projects to strengthen your responses."
            ),
            "improvement_suggestions": [
                f"Dedicate 2-3 weeks to studying {weak_topics[0]}" if weak_topics else "Review all core CS fundamentals",
                "Practice explaining technical concepts out loud to improve clarity",
                "Work through 2-3 LeetCode problems daily to sharpen problem-solving",
                f"Build a small project using {weak_topics[1] if len(weak_topics) > 1 else 'a weak area'} to solidify understanding",
            ],
        }


feedback_engine = FeedbackEngine()
