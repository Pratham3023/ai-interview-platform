"""
Scoring Engine
Transparent, weighted scoring system. Weights are configurable via env vars.

Score dimensions:
  Technical Knowledge     30%
  Coding Performance      25%
  Answer Quality          15%
  Keyword Coverage        10%
  Communication           10%
  Confidence Indicator    10%
"""

import logging
from typing import Dict, List, Any, Tuple

from app.config import settings
from app.models import TopicStatus

logger = logging.getLogger(__name__)


class ScoringEngine:

    # ── Per-Answer Composite Score ────────────────────────────────────────────

    def compute_composite_score(
        self,
        keyword_score: float,   # 0-10
        semantic_score: float,  # 0-10
        llm_score: float,       # 0-10
        prosodic_score: float = 5.0,  # 0-10
    ) -> float:
        """
        Weighted composite score per answer (0–10).
        Weights are fixed per answer; session-level weights applied separately.
        """
        # Per-answer: keyword + semantic + llm evenly weighted (prosodic secondary)
        technical = (keyword_score * 0.35 + semantic_score * 0.35 + llm_score * 0.30)
        # Blend confidence signal lightly
        composite = technical * 0.90 + prosodic_score * 0.10
        return round(min(max(composite, 0.0), 10.0), 2)

    # ── Topic Score Aggregation ───────────────────────────────────────────────

    def aggregate_topic_scores(
        self, answers: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """
        Average composite scores by topic. Returns {topic: avg_score_0_to_100}.
        """
        topic_totals: Dict[str, List[float]] = {}
        for ans in answers:
            topic = ans.get("topic", "General")
            score = ans.get("composite_score", 5.0)
            topic_totals.setdefault(topic, []).append(score)

        return {
            topic: round(sum(scores) / len(scores) * 10, 2)  # ×10 → 0–100
            for topic, scores in topic_totals.items()
        }

    # ── Weak/Strong Topic Classification ─────────────────────────────────────

    def classify_topics(
        self, topic_scores: Dict[str, float]
    ) -> Tuple[List[str], List[str], Dict[str, str]]:
        """
        Returns weak_topics, strong_topics, topic_statuses.
        Uses configurable thresholds from settings.
        """
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

    # ── Session-Level Overall Score ───────────────────────────────────────────

    def compute_overall_score(
        self,
        answers: List[Dict[str, Any]],
        coding_answers: List[Dict[str, Any]],
        prosodic_scores: List[float],
    ) -> Dict[str, float]:
        """
        Compute all session-level scores using configured weights.
        All output scores are on 0–100 scale.
        """
        # Technical score: avg of non-coding answers
        tech_answers = [a for a in answers if a.get("question_type") not in ("coding",)]
        if tech_answers:
            technical_score = sum(
                a.get("composite_score", 0) for a in tech_answers
            ) / len(tech_answers) * 10
        else:
            technical_score = 0.0

        # Coding score
        if coding_answers:
            coding_score = sum(
                a.get("coding_score", 0) for a in coding_answers
            ) / len(coding_answers) * 10
        else:
            coding_score = technical_score  # fallback to tech if no coding Q

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

        # Weighted overall (0–100)
        overall = (
            technical_score * settings.SCORE_WEIGHT_TECHNICAL
            + coding_score * settings.SCORE_WEIGHT_CODING
            + answer_quality * settings.SCORE_WEIGHT_ANSWER_QUALITY
            + keyword_score * settings.SCORE_WEIGHT_KEYWORD
            + communication_score * settings.SCORE_WEIGHT_COMMUNICATION
            + confidence_indicator * settings.SCORE_WEIGHT_CONFIDENCE
        )

        return {
            "overall_score": round(min(overall, 100.0), 2),
            "technical_score": round(technical_score, 2),
            "coding_score": round(coding_score, 2),
            "keyword_coverage_score": round(keyword_score, 2),
            "answer_quality_score": round(answer_quality, 2),
            "communication_score": round(communication_score, 2),
            "confidence_indicator": round(confidence_indicator, 2),
        }


scoring_engine = ScoringEngine()
