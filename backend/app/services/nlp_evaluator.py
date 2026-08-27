"""
NLP Answer Evaluator
Combines three signals:
  1. Keyword Coverage Ratio (deterministic)
  2. Cosine Semantic Similarity (sentence-transformers)
  3. Gemini LLM Evaluation

Final score per signal: 0–10
"""

import logging
import re
from typing import Dict, List, Tuple, Any
from functools import lru_cache

logger = logging.getLogger(__name__)

# ── Sentence Transformers (lazy-loaded) ───────────────────────────────────────

_st_model = None


def _get_st_model():
    # Bypassed to prevent memory overload and timeouts on Render Free tier
    # Gemini LLM is already providing the necessary evaluation.
    return None


# ── 1. Keyword Coverage ───────────────────────────────────────────────────────

def compute_keyword_coverage(
    answer: str,
    expected_keywords: List[str],
) -> Tuple[float, List[str], List[str]]:
    """
    Coverage Score = matched_keywords / total_expected_keywords × 10

    Returns:
        score (0–10), matched keywords, missed keywords
    """
    if not expected_keywords:
        return 5.0, [], []

    answer_lower = answer.lower()
    matched = []
    missed = []

    for kw in expected_keywords:
        pattern = r"\b" + re.escape(kw.lower()) + r"\b"
        if re.search(pattern, answer_lower):
            matched.append(kw)
        else:
            missed.append(kw)

    score = (len(matched) / len(expected_keywords)) * 10.0
    return round(score, 2), matched, missed


# ── 2. Semantic Similarity ────────────────────────────────────────────────────

def compute_semantic_similarity(
    candidate_answer: str,
    ideal_answer: str,
) -> float:
    """
    Cosine similarity between candidate answer and ideal answer embeddings.
    Returns: 0–10 score.
    """
    model = _get_st_model()
    if model is None or not ideal_answer:
        return 5.0  # neutral if no model or no ideal answer

    try:
        import numpy as np
        embeddings = model.encode([candidate_answer, ideal_answer])
        a, b = embeddings[0], embeddings[1]
        similarity = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))
        # Map [-1,1] → [0,10]
        score = (similarity + 1) / 2 * 10
        return round(min(max(score, 0.0), 10.0), 2)
    except Exception as e:
        logger.warning("Semantic similarity failed: %s", e)
        return 5.0


# ── 3. NLP Evaluator (combines all signals) ───────────────────────────────────

class NLPEvaluator:
    """
    Main evaluation pipeline per answer.
    Combines keyword coverage + semantic similarity + LLM evaluation.
    """

    def evaluate_answer_sync(
        self,
        question: str,
        answer: str,
        topic: str,
        expected_keywords: List[str],
        ideal_answer: str = "",
    ) -> Dict[str, Any]:
        """
        Synchronous evaluation (keyword + semantic only, no LLM).
        Use this for fast in-session feedback.
        """
        keyword_score, matched, missed = compute_keyword_coverage(answer, expected_keywords)
        semantic_score = compute_semantic_similarity(answer, ideal_answer)

        # Word count as a proxy for answer completeness
        word_count = len(answer.split())
        length_score = min(word_count / 80, 1.0) * 10  # full credit at 80+ words

        return {
            "keyword_score": keyword_score,
            "semantic_score": semantic_score,
            "length_score": round(length_score, 2),
            "matched_keywords": matched,
            "missed_keywords": missed,
            "word_count": word_count,
        }

    async def evaluate_answer_full(
        self,
        question: str,
        answer: str,
        topic: str,
        expected_keywords: List[str],
        ideal_answer: str = "",
        use_llm: bool = True,
    ) -> Dict[str, Any]:
        """
        Full async evaluation including LLM.
        """
        sync_result = self.evaluate_answer_sync(
            question, answer, topic, expected_keywords, ideal_answer
        )

        llm_result = {}
        if use_llm and answer.strip():
            try:
                from app.services.gemini_service import gemini_service
                llm_result = await gemini_service.evaluate_answer(
                    question, answer, topic, expected_keywords
                )
            except Exception as e:
                logger.warning("LLM evaluation failed: %s", e)

        llm_score = float(llm_result.get("score", sync_result["keyword_score"]))

        return {
            **sync_result,
            "llm_score": llm_score,
            "llm_feedback": llm_result.get("brief_feedback", ""),
            "correctness": llm_result.get("correctness", "partially_correct"),
            "relevance": llm_result.get("relevance", "medium"),
        }


nlp_evaluator = NLPEvaluator()
