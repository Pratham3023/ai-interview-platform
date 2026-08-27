"""
Resume Skill Extraction Service
Uses PyMuPDF for PDF parsing and a custom keyword database for skill matching.
"""

import fitz  # PyMuPDF
import re
import logging
from typing import Dict, List, Tuple
from pathlib import Path
import json

logger = logging.getLogger(__name__)

# ── Load Skill Database ───────────────────────────────────────────────────────

_SKILL_DB_PATH = Path(__file__).parent.parent.parent / "data" / "skills.json"
_skill_db: Dict[str, List[str]] = {}


def _load_skill_db() -> Dict[str, List[str]]:
    global _skill_db
    if not _skill_db:
        if _SKILL_DB_PATH.exists():
            with open(_SKILL_DB_PATH, "r", encoding="utf-8") as f:
                _skill_db = json.load(f)
        else:
            logger.warning("skills.json not found at %s", _SKILL_DB_PATH)
    return _skill_db


# ── PDF Text Extraction ───────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract raw text from a PDF resume using PyMuPDF.
    Handles multi-column layouts by using text-block ordering.
    """
    text_parts = []
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            # Use "text" mode for simple extraction; blocks for layout-aware
            blocks = page.get_text("blocks")
            # Sort blocks top-to-bottom, left-to-right
            blocks.sort(key=lambda b: (round(b[1] / 20), b[0]))
            for block in blocks:
                if block[6] == 0:  # text block (not image)
                    text_parts.append(block[4])
        doc.close()
    except Exception as e:
        logger.error("PDF extraction failed: %s", e)
        raise ValueError(f"Could not extract text from PDF: {e}")

    full_text = "\n".join(text_parts)
    if len(full_text.strip()) < 50:
        raise ValueError("Extracted text is too short. The resume may be image-based or empty.")
    return full_text


def clean_text(text: str) -> str:
    """Normalize whitespace and remove control characters."""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\n]", " ", text)
    return text.strip()


# ── Skill Extraction ──────────────────────────────────────────────────────────

def extract_skills(raw_text: str) -> Tuple[Dict[str, List[str]], List[str]]:
    """
    Match resume text against the custom skill keyword database.

    Returns:
        skill_profile: {"DBMS": ["SQL", "normalization"], "DSA": ["arrays"], ...}
        all_skills:    flat list of all detected skills
    """
    skill_db = _load_skill_db()
    text_lower = raw_text.lower()
    skill_profile: Dict[str, List[str]] = {}
    all_skills: List[str] = []

    for domain, keywords in skill_db.items():
        matched = []
        for kw in keywords:
            # Match whole-word patterns to avoid false positives
            pattern = r"\b" + re.escape(kw.lower()) + r"\b"
            if re.search(pattern, text_lower):
                matched.append(kw)
        if matched:
            skill_profile[domain] = matched
            all_skills.extend(matched)

    # Deduplicate while preserving order
    seen = set()
    unique_skills = []
    for s in all_skills:
        if s not in seen:
            seen.add(s)
            unique_skills.append(s)

    return skill_profile, unique_skills


def extract_candidate_name(text: str) -> str:
    """
    Heuristic: first non-empty line that looks like a name.
    (Not perfect — just a best-effort helper.)
    """
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines[:5]:
        words = line.split()
        if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w):
            return line
    return "Candidate"
