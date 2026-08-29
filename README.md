# Adaptive AI Interview System — Complete Setup Guide

## Quick Start (3 commands)

```bash
# 1. Backend
cd backend
pip install -r requirements.txt
cp .env.example .env  # Fill in your API keys
python seed_database.py
uvicorn app.main:app --reload

# 2. Frontend (in new terminal)
cd frontend
npm install
npm run dev
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.10+ | https://python.org |
| MongoDB | 7.0+ | https://www.mongodb.com/try/download/community |
| Redis | 7.0+ | https://redis.io/download (or use Redis Cloud free tier) |
| Node.js | 18+ | https://nodejs.org |

---

## API Keys Required

### 1. Google Gemini (AI feedback, follow-up questions)
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Add to `.env`: `GEMINI_API_KEY=your_key_here`

### 2. Piston Code Execution
No API keys or credit cards required! The system is pre-configured to use the free, open-source Piston API for live code execution (`https://emacs.piston.rs/api/v2`).

---

## Environment Setup

### Copy and edit `.env`:
```bash
cd backend
cp .env.example .env
```

Minimum required in `.env`:
```
MONGODB_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_key
SECRET_KEY=any-long-random-string-here
PISTON_API_URL=https://emacs.piston.rs/api/v2
```

---

## Seed the Database

```bash
cd backend
python seed_database.py
```

This inserts 300+ questions and creates all MongoDB indexes.

---

## Running the Application

### Backend (FastAPI + Uvicorn):
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
- API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/health

### Frontend (Vite React):
```bash
cd frontend
npm install
npm run dev
```
- App: http://localhost:5173

---

## Architecture

```
project/
├── backend/
│   ├── app/
│   │   ├── main.py              ← FastAPI app entry
│   │   ├── config.py            ← Settings (pydantic-settings)
│   │   ├── database.py          ← MongoDB + Redis connections
│   │   ├── models/              ← MongoDB document schemas
│   │   ├── schemas/             ← API request/response schemas
│   │   ├── api/                 ← Route handlers
│   │   │   ├── auth.py          ← JWT auth
│   │   │   ├── resume.py        ← PDF upload + skill extraction
│   │   │   ├── interview.py     ← Session management
│   │   │   ├── coding.py        ← Judge0 integration
│   │   │   └── results.py       ← Scoring, feedback, roadmap, dashboard
│   │   └── services/            ← Business logic (engines)
│   │       ├── skill_extraction.py   ← PyMuPDF + keyword matching
│   │       ├── adaptive_algorithm.py ← Core adaptive interview engine
│   │       ├── nlp_evaluator.py      ← Keyword + semantic + LLM scoring
│   │       ├── scoring_engine.py     ← Multi-dimensional scoring
│   │       ├── voice_analyzer.py     ← Librosa prosodic features
│   │       ├── roadmap_generator.py  ← NetworkX DAG + week plans
│   │       ├── gemini_service.py     ← Google Gemini AI client
│   │       ├── feedback_engine.py    ← AI feedback report
│   │       └── piston_service.py     ← Piston code execution
│   └── data/
│       ├── questions.json       ← 300+ interview questions
│       ├── skills.json          ← 200+ skill keywords
│       └── knowledge_base.json  ← Study resources + tasks
└── frontend/
    └── src/
        ├── pages/               ← All 8 pages
        ├── components/          ← Reusable UI components
        ├── services/api.js      ← Axios API client
        └── context/AuthContext  ← Global auth state
```

---

## Key Features

### Adaptive Interview Algorithm
- Starts with "Introduce Yourself" for baseline
- Adjusts difficulty based on rolling scores (last 2 answers)
- Score > 7.5/10 → increase difficulty; Score < 4.0/10 → decrease
- Generates keyword-targeted follow-up questions via Gemini when ≥2 keywords missed
- Selects questions from candidate's detected skill profile

### Multi-Dimensional Scoring
| Dimension | Weight | Method |
|-----------|--------|--------|
| Technical Knowledge | 30% | Keyword + semantic + LLM |
| Coding Performance | 25% | Piston execution results |
| Answer Quality | 15% | Semantic similarity (MiniLM) |
| Keyword Coverage | 10% | Regex keyword matching |
| Communication | 10% | Answer length heuristics |
| Confidence Indicator | 10% | Librosa prosodic features |

### Roadmap Generator
- Uses NetworkX DAG for prerequisite ordering
- Allocates study weeks by deficit severity:
  - Score < 40 → 3 weeks (very weak)
  - Score < 60 → 2 weeks (moderately weak)
  - Score < 75 → 1 week (slightly weak)
- Populates with curated resources from knowledge base

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend Framework | FastAPI (async) |
| Database | MongoDB (Motor async driver) |
| Session Cache | Redis (async) |
| AI/LLM | Google Gemini 2.5 Flash |
| Code Execution | Piston API (Open Source) |
| NLP | sentence-transformers (MiniLM-L6-v2) |
| Audio Analysis | Librosa |
| Graph/Roadmap | NetworkX |
| ML Scoring | XGBoost |
| Resume Parsing | PyMuPDF (fitz) |
| Auth | JWT (python-jose + bcrypt) |
| Frontend | React 18 + Vite |
| State Management | React Context API |
| Charts | Recharts |
| Code Editor | Monaco Editor |
| Animations | Framer Motion |

---

## Troubleshooting

**MongoDB connection error:**
```bash
# Start MongoDB on Windows
net start MongoDB
```

**Redis connection error:**
```bash
# Start Redis on Windows (if installed via MSI)
redis-server
```

**Gemini API errors:**
- Verify your API key at https://aistudio.google.com/
- Ensure you have quota available (free tier: 15 RPM)

**Piston Code Execution:**
- Works completely free out of the box via public endpoint.
- If it times out, verify your internet connection or check https://github.com/engineer-man/piston

**spaCy model missing:**
```bash
python -m spacy download en_core_web_sm
```

---


