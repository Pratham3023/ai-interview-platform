"""
Roadmap Generator
Uses NetworkX to model topic prerequisites as a DAG.
Generates a prioritized week-by-week learning plan from weak topics.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

import networkx as nx

from app.models import WeekPlan, DailyTask

logger = logging.getLogger(__name__)

# ── Load Knowledge Base ───────────────────────────────────────────────────────

_KB_PATH = Path(__file__).parent.parent.parent / "data" / "knowledge_base.json"
_kb: Dict = {}


def _load_kb() -> Dict:
    global _kb
    if not _kb and _KB_PATH.exists():
        with open(_KB_PATH, "r", encoding="utf-8") as f:
            _kb = json.load(f)
    return _kb


# ── Prerequisite Graph ────────────────────────────────────────────────────────

# Topic → list of prerequisites
PREREQUISITES: Dict[str, List[str]] = {
    "DSA": ["Python", "Java"],
    "Algorithms": ["DSA"],
    "DBMS": [],
    "SQL": ["DBMS"],
    "OS": [],
    "Computer Networks": ["OS"],
    "Networking": ["OS"],
    "Machine Learning": ["Python", "DSA"],
    "OOP": ["Java", "Python"],
    "Web Development": ["JavaScript", "HTML/CSS"],
    "React": ["Web Development", "JavaScript"],
    "FastAPI": ["Python"],
    "MongoDB": ["DBMS"],
    "Python": [],
    "Java": [],
    "JavaScript": [],
}


def build_prerequisite_dag() -> nx.DiGraph:
    """Build a NetworkX directed acyclic graph of topic prerequisites."""
    G = nx.DiGraph()
    for topic, prereqs in PREREQUISITES.items():
        G.add_node(topic)
        for prereq in prereqs:
            G.add_edge(prereq, topic)  # prereq → topic
    return G


# ── Week Allocation ───────────────────────────────────────────────────────────

def _get_severity(score: float) -> Tuple[str, int]:
    """
    Returns (severity_label, weeks_to_allocate) based on topic score.
    Thresholds from project report: <40 very_weak, 40–60 moderately_weak, 60–75 slightly_weak
    """
    if score < 40:
        return "very_weak", 3
    elif score < 60:
        return "moderately_weak", 2
    else:
        return "slightly_weak", 1


# ── Roadmap Assembly ──────────────────────────────────────────────────────────

class RoadmapGenerator:

    def __init__(self):
        self._dag = build_prerequisite_dag()

    def generate(
        self,
        topic_scores: Dict[str, float],
        weak_topics: List[str],
        job_role: str = "Software Engineer",
    ) -> List[WeekPlan]:
        """
        Generate a prerequisite-ordered, severity-weighted roadmap.

        1. Find prerequisite ancestors for each weak topic
        2. Topological sort → correct learning order
        3. Allocate weeks per severity
        4. Populate with daily tasks from knowledge base
        """
        if not weak_topics:
            return []

        kb = _load_kb()

        # Collect all nodes needed: weak topics + their prerequisites
        needed_nodes = set(weak_topics)
        for topic in weak_topics:
            if topic in self._dag:
                ancestors = nx.ancestors(self._dag, topic)
                needed_nodes.update(ancestors)

        # Build subgraph and topologically sort
        subgraph = self._dag.subgraph(needed_nodes).copy()
        try:
            ordered = list(nx.topological_sort(subgraph))
        except nx.NetworkXUnfeasible:
            ordered = list(needed_nodes)

        # Assign scores (prerequisites get their topic score if known, else 50)
        def get_score(t: str) -> float:
            return topic_scores.get(t, 50.0)

        week_plans: List[WeekPlan] = []
        week_num = 1

        for topic in ordered:
            score = get_score(topic)
            if score >= 75:
                continue  # skip strong topics

            severity, num_weeks = _get_severity(score)
            topic_kb = kb.get(topic, {})
            focus = topic_kb.get("focus", f"Core {topic} concepts")
            resources = topic_kb.get("resources", [])
            tasks_pool = topic_kb.get("tasks", [
                f"Study {topic} fundamentals",
                f"Practice {topic} problems",
                f"Review {topic} concepts",
                f"Build a small {topic} project",
                f"Take notes on {topic} key points",
            ])

            for w in range(num_weeks):
                daily_tasks = []
                for day in range(1, 6):  # 5 days/week
                    task_idx = (w * 5 + day - 1) % len(tasks_pool)
                    res_idx = (w * 5 + day - 1) % len(resources) if resources else -1
                    daily_tasks.append(DailyTask(
                        day=day,
                        task=tasks_pool[task_idx],
                        resource_url=resources[res_idx].get("url") if res_idx >= 0 else None,
                        resource_type=resources[res_idx].get("type", "article") if res_idx >= 0 else "article",
                    ))

                week_plans.append(WeekPlan(
                    week=week_num,
                    topic=topic,
                    focus=f"Week {w + 1}/{num_weeks}: {focus}",
                    severity=severity,
                    daily_tasks=daily_tasks,
                ))
                week_num += 1

        return week_plans


roadmap_generator = RoadmapGenerator()
