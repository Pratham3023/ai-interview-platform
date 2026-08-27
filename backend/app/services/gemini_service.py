"""
Gemini AI Service — Modular LLM Client

Provider: Google Gemini 2.5 Flash (configurable via GEMINI_MODEL env var)
All LLM calls go through this single module, making it easy to swap providers.
"""

import logging
import json
import re
from typing import Optional, List, Dict, Any

import google.generativeai as genai

from app.config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    """
    Modular Gemini client.
    All calls are async-compatible via run_in_executor wrapping.
    """

    def __init__(self):
        self._initialized = False

    def _ensure_init(self):
        if not self._initialized:
            if not settings.GEMINI_API_KEY:
                logger.warning("GEMINI_API_KEY not set — AI features degraded")
                return
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._model = genai.GenerativeModel(settings.GEMINI_MODEL)
            self._initialized = True

    def _call(self, prompt: str) -> str:
        """Synchronous Gemini call (wrapped async in callers)."""
        self._ensure_init()
        if not self._initialized:
            return ""
        try:
            response = self._model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error("Gemini call failed: %s", e)
            return ""

    # ── Follow-up Question Generation ────────────────────────────────────────

    async def generate_followup_question(
        self,
        original_question: str,
        candidate_answer: str,
        missed_keywords: List[str],
        topic: str,
    ) -> str:
        """
        Generate a targeted follow-up probing the missed concepts.
        Returns a single follow-up question string.
        """
        if not missed_keywords:
            return ""

        prompt = f"""You are an experienced technical interviewer.

The candidate was asked:
"{original_question}"

Their answer was:
"{candidate_answer}"

The answer was missing these important concepts: {', '.join(missed_keywords)}

Generate ONE concise follow-up question that specifically targets the missing concepts.
The question should feel natural and conversational, like a real interviewer would ask.
Only return the question text — no explanations, no numbering, no quotes.
Topic: {topic}"""

        import asyncio
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, self._call, prompt)
        # Clean up any surrounding quotes
        return result.strip('"\'').strip() or f"Can you explain more about {', '.join(missed_keywords[:2])} in {topic}?"

    # ── Answer Evaluation ────────────────────────────────────────────────────

    async def evaluate_answer(
        self,
        question: str,
        answer: str,
        topic: str,
        expected_keywords: List[str],
    ) -> Dict[str, Any]:
        """
        Evaluate answer quality using Gemini. Returns structured JSON.
        Score: 0–10.
        """
        prompt = f"""You are a strict but fair technical interviewer evaluating a candidate's answer.

Question: "{question}"
Topic: {topic}
Expected key concepts: {', '.join(expected_keywords)}

Candidate's answer: "{answer}"

Evaluate the answer and return a JSON object with these exact fields:
{{
  "score": <number 0-10>,
  "relevance": <"high"|"medium"|"low">,
  "correctness": <"correct"|"partially_correct"|"incorrect">,
  "completeness": <"complete"|"partial"|"incomplete">,
  "clarity": <"clear"|"moderate"|"unclear">,
  "brief_feedback": "<one sentence feedback>",
  "key_concepts_covered": ["<concept1>", "<concept2>"],
  "key_concepts_missing": ["<concept1>", "<concept2>"]
}}

Return ONLY the JSON object, no other text."""

        import asyncio
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(None, self._call, prompt)

        try:
            # Extract JSON from response
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                return json.loads(match.group())
        except (json.JSONDecodeError, AttributeError):
            pass

        # Fallback
        return {
            "score": 5.0,
            "relevance": "medium",
            "correctness": "partially_correct",
            "completeness": "partial",
            "clarity": "moderate",
            "brief_feedback": "Unable to evaluate — please try again.",
            "key_concepts_covered": [],
            "key_concepts_missing": expected_keywords,
        }

    # ── AI Feedback Report ───────────────────────────────────────────────────

    async def generate_feedback_report(
        self,
        session_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive, personalized feedback report from session data.
        """
        topic_scores = session_data.get("topic_scores", {})
        weak_topics = session_data.get("weak_topics", [])
        strong_topics = session_data.get("strong_topics", [])
        overall_score = session_data.get("overall_score", 0)
        job_role = session_data.get("job_role", "Software Engineer")
        answers_summary = session_data.get("answers_summary", [])

        prompt = f"""You are an expert career coach generating a personalized interview feedback report.

Candidate applied for: {job_role}
Overall Score: {overall_score:.1f}/100

Topic Performance:
{json.dumps(topic_scores, indent=2)}

Strong Topics: {', '.join(strong_topics) if strong_topics else 'None identified'}
Weak Topics: {', '.join(weak_topics) if weak_topics else 'None identified'}

Answer highlights:
{json.dumps(answers_summary[:5], indent=2)}

Generate a personalized feedback report as a JSON object with these exact fields:
{{
  "overall_summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "weaknesses": ["<weakness1>", "<weakness2>", "<weakness3>"],
  "technical_feedback": "<2-3 sentences about technical performance>",
  "communication_feedback": "<1-2 sentences about communication>",
  "improvement_suggestions": [
    "<specific actionable suggestion 1>",
    "<specific actionable suggestion 2>",
    "<specific actionable suggestion 3>",
    "<specific actionable suggestion 4>"
  ]
}}

Make the feedback specific to the actual data — avoid generic statements.
Return ONLY the JSON object."""

        import asyncio
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(None, self._call, prompt)

        try:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                return json.loads(match.group())
        except (json.JSONDecodeError, AttributeError):
            pass

        return self._default_feedback(weak_topics, strong_topics, overall_score)

    # ── Roadmap Text Enhancement ─────────────────────────────────────────────

    async def enhance_roadmap_task(self, topic: str, week: int, focus: str) -> str:
        """Generate a natural language description for a roadmap week."""
        prompt = f"""In 1-2 sentences, describe what a student should accomplish in Week {week} 
        when studying {topic} (focus: {focus}). Be specific and actionable. 
        No bullet points — just natural text."""

        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._call, prompt)

    def _default_feedback(self, weak: List[str], strong: List[str], score: float) -> Dict[str, Any]:
        return {
            "overall_summary": f"The candidate achieved an overall score of {score:.1f}/100. "
                               f"{'Performance was strong overall.' if score >= 70 else 'There is significant room for improvement.'}",
            "strengths": [f"Demonstrated knowledge in {t}" for t in (strong[:3] or ["General CS concepts"])],
            "weaknesses": [f"Needs improvement in {t}" for t in (weak[:3] or ["To be determined"])],
            "technical_feedback": "Technical responses showed varying levels of depth across topics.",
            "communication_feedback": "Communication was adequate for the session.",
            "improvement_suggestions": [
                f"Focus on strengthening {weak[0]}" if weak else "Review core CS fundamentals",
                "Practice explaining concepts clearly and concisely",
                "Work through coding problems daily",
                "Review missed keywords in each topic",
            ],
        }


# Singleton
gemini_service = GeminiService()
