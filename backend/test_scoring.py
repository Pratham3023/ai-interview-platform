from app.services.scoring_engine import scoring_engine

answers = [
    {"question_type": "aptitude_mcq", "is_correct": True},
    {"question_type": "aptitude_mcq", "is_correct": False},
    {"question_type": "role_mcq", "is_correct": True},
    {"question_type": "technical", "composite_score": 8.0, "topic": "React"},
    {"question_type": "coding", "coding_score": 9.0, "topic": "Algorithms"}
]

res = scoring_engine.compute_overall_score(answers, answers, [5.0])
print(res)
