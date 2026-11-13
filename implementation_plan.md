# Fix Score Breakdown Bug

## Problem
The "Score Breakdown" dials in the frontend (Aptitude MCQ, Role MCQ, Adaptive Tech, Coding) are all showing 0. 

I've discovered two root causes in the backend:
1. **Duplicate Class Definition**: `scoring_engine.py` contains two definitions for the `ScoringEngine` class. The second definition completely overwrites the first one. Crucially, the second definition calculates a generic "technical score" instead of the 4 individual phase scores (Aptitude, Role MCQ, Adaptive, Coding) that the frontend explicitly requires.
2. **Missing Properties in Response**: The endpoint in `results.py` that computes and returns the `ScoreResponse` is not passing the 4 phase scores into the response model, causing them to default to `0.0` when sent to the frontend.

## Proposed Changes

### `scoring_engine.py`
I will merge the two duplicate class definitions into a single, clean `ScoringEngine` class:
- **Phase Scoring**: I will restore the first definition's 4-phase weighting logic (Aptitude: 20%, Role MCQ: 25%, Adaptive: 30%, Coding: 25%) which mathematically aligns with the 4-phase interview format.
- **Topic Aggregation**: I will keep the second definition's logic for `aggregate_topic_scores` so that MCQ topics are also included in the user's Topic chart.
- **Combined Output**: `compute_overall_score` will return both the 4 phase scores (for the frontend dials) and the granular heuristic scores (communication, keyword coverage, etc.) so no data is lost.

### `app/api/results.py`
I will update `compute_scores` and `get_scores` to properly extract and pass `aptitude_score`, `role_mcq_score`, and `adaptive_score` into the `ScoreResponse` so the frontend actually receives them.

## User Review Required
Does this scoring distribution (Aptitude: 20%, Role MCQ: 25%, Adaptive: 30%, Coding: 25%) look correct to you? If so, I'll go ahead and apply these fixes!
