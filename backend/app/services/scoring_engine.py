"""
Scoring Engine — 4-Phase Interview Scoring

Phase weights:
  Phase 1 — Aptitude MCQ   : 20%
  Phase 2 — Role MCQ       : 25%
  Phase 3 — Adaptive Open  : 30%
  Phase 4 — Coding         : 25%
"""

import logging
from typing import Dict, List, Any, Tuple

from app.config import settings
from app.models import TopicStatus

logger = logging.getLogger(__name__)

# ── Phase weights ──────────────────────────────────────────────────────────────
WEIGHT_APTITUDE  = 0.20
WEIGHT_ROLE_MCQ  = 0.25
WEIGHT_ADAPTIVE  = 0.30
WEIGHT_CODING    = 0.25

class ScoringEngine:

    # ── MCQ Scoring ───────────────────────────────────────────────────────────

    def score_mcq_phase(
        self,
        answers: List[Dict[str, Any]],
        phase: str,          # "aptitude_mcq" or "role_mcq"
        total_expected: int, # 15
    ) -> Tuple[float, int]:
        """
        Returns (score_0_to_100, correct_count).
        Looks at answers where question_type == phase.
        """
        phase_answers = [a for a in answers if a.get("question_type") == phase]
        if not phase_answers:
            return 0.0, 0

        correct = sum(1 for a in phase_answers if a.get("is_correct") is True)
        score = (correct / total_expected) * 100.0
        return round(score, 2), correct

    # ── Adaptive Scoring ──────────────────────────────────────────────────────

    def score_adaptive_phase(self, answers: List[Dict[str, Any]]) -> float:
        """
        Average composite_score (0–10) of all 'technical' type answers, scaled to 0–100.
        """
        adaptive = [a for a in answers if a.get("question_type") == "technical"]
        if not adaptive:
            return 0.0
        avg = sum(a.get("composite_score", 0.0) for a in adaptive) / len(adaptive)
        return round(min(avg * 10.0, 100.0), 2)

    # ── Coding Scoring ────────────────────────────────────────────────────────

    def score_coding_phase(self, answers: List[Dict[str, Any]]) -> float:
        """
        Average coding_score (0–10) of all 'coding' type answers, scaled to 0–100.
        """
        coding = [a for a in answers if a.get("question_type") == "coding"]
        if not coding:
            return 0.0
        avg = sum(a.get("coding_score", 0.0) for a in coding) / len(coding)
        return round(min(avg * 10.0, 100.0), 2)

    # ── Overall Score ─────────────────────────────────────────────────────────

    def compute_overall_score(
        self, 
        answers: List[Dict[str, Any]],
        coding_answers: List[Dict[str, Any]],
        prosodic_scores: List[float],
    ) -> Dict[str, Any]:
        """
        Compute all phase scores and weighted overall score from session answers.
        Returns dict ready to $set on the session document.
        """
        aptitude_score,   apt_correct  = self.score_mcq_phase(answers, "aptitude_mcq", 15)
        role_mcq_score,   role_correct = self.score_mcq_phase(answers, "role_mcq",     15)
        adaptive_score                 = self.score_adaptive_phase(answers)
        coding_score                   = self.score_coding_phase(answers)

        overall = (
            aptitude_score  * WEIGHT_APTITUDE
            + role_mcq_score  * WEIGHT_ROLE_MCQ
            + adaptive_score  * WEIGHT_ADAPTIVE
            + coding_score    * WEIGHT_CODING
        )

        # Keyword coverage
        all_kw_scores = [a.get("keyword_score", 0) for a in answers]
        keyword_score = (sum(all_kw_scores) / len(all_kw_scores) * 10) if all_kw_scores else 0.0

        # Answer quality (semantic + llm average)
        all_quality = [
            (a.get("semantic_score", 0) + a.get("llm_score", 0)) / 2
            for a in answers
        ]
        answer_quality = (sum(all_quality) / len(all_quality) * 10) if all_quality else 0.0

        # Communication proxy (length, coherence — simple heuristic)
        long_answers = [a for a in answers if len(a.get("answer_text", "").split()) > 30]
        communication_score = min(len(long_answers) / max(len(answers), 1) * 100, 100)

        # Confidence indicator from prosodic scores
        confidence_indicator = (
            sum(prosodic_scores) / len(prosodic_scores) * 10
            if prosodic_scores
            else 50.0  # neutral default
        )

        return {
            "overall_score":      round(min(overall, 100.0), 2),
            "aptitude_score":     aptitude_score,
            "aptitude_correct":   apt_correct,
            "role_mcq_score":     role_mcq_score,
            "role_mcq_correct":   role_correct,
            "adaptive_score":     adaptive_score,
            "coding_score":       coding_score,
            "technical_score":    adaptive_score,   # alias
            "communication_score":  round(communication_score, 2),
            "confidence_indicator": round(confidence_indicator, 2),
            "answer_quality_score": round(answer_quality, 2),
            "keyword_coverage_score": round(keyword_score, 2),
        }

    # ── Per-Answer Composite (Adaptive Phase) ─────────────────────────────────

    def compute_composite_score(
        self,
        keyword_score:  float,
        semantic_score: float,
        llm_score:      float,
        prosodic_score: float = 5.0,
    ) -> float:
        """Weighted composite per adaptive answer (0–10)."""
        technical = keyword_score * 0.35 + semantic_score * 0.35 + llm_score * 0.30
        composite = technical * 0.90 + prosodic_score * 0.10
        return round(min(max(composite, 0.0), 10.0), 2)

    # ── Topic Score Aggregation ───────────────────────────────────────────────

    def aggregate_topic_scores(self, answers: List[Dict[str, Any]]) -> Dict[str, float]:
        """Average composite scores by topic. Returns {topic: avg_score_0_to_100}."""
        topic_totals: Dict[str, List[float]] = {}
        for ans in answers:
            topic = ans.get("topic", "General")
            score = ans.get("composite_score", 5.0)
            topic_totals.setdefault(topic, []).append(score)

        return {
            topic: round(sum(scores) / len(scores) * 10, 2)
            for topic, scores in topic_totals.items()
        }

    # ── Weak/Strong Topic Classification ─────────────────────────────────────

    def classify_topics(
        self, topic_scores: Dict[str, float]
    ) -> Tuple[List[str], List[str], Dict[str, str]]:
        """Returns (weak_topics, strong_topics, topic_statuses)."""
        weak, strong, statuses = [], [], {}
        for topic, score in topic_scores.items():
            if score < settings.THRESHOLD_WEAK:
                weak.append(topic)
                statuses[topic] = TopicStatus.WEAK.value
            elif score < settings.THRESHOLD_NEEDS_IMPROVEMENT:
                statuses[topic] = TopicStatus.NEEDS_IMPROVEMENT.value
            else:
                strong.append(topic)
                statuses[topic] = TopicStatus.STRONG.value
        return weak, strong, statuses

scoring_engine = ScoringEngine()
