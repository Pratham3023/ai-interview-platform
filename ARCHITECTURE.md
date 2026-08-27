# System Architecture: Adaptive AI Interview Platform

## 1. High-Level Overview
The system follows a modern decoupled architecture:
- **Frontend**: React 18 single-page application (SPA) built with Vite, handling UI, state management, and API communication.
- **Backend**: FastAPI asynchronous server providing RESTful APIs, business logic engines, and third-party API orchestration.
- **Data Persistence**: MongoDB (NoSQL) for document storage (questions, sessions, roadmaps) and Redis (In-Memory) for fast session state management and caching.

## 2. Component Architecture

### 2.1 Backend Layers
The backend is structured into five distinct layers for maximum modularity:

1. **API Routing Layer (`app/api/`)**: Defines REST endpoints, validates incoming JSON using Pydantic, handles authentication, and routes requests to the appropriate service engines.
2. **Business Logic / Service Layer (`app/services/`)**: Contains the core logic:
   - `adaptive_algorithm.py`: Controls interview flow and question difficulty adjustments.
   - `scoring_engine.py`: Computes the multi-dimensional candidate score.
   - `nlp_evaluator.py`: Evaluates answers using semantic similarity and keyword matching.
   - `skill_extraction.py`: Parses PDF resumes using PyMuPDF and extracts technical skills.
   - `roadmap_generator.py`: Generates directed acyclic graph (DAG) based study plans.
3. **External Integrations Layer**:
   - `gemini_service.py`: Client for Google Gemini 2.5 Flash API (LLM evaluation, follow-up generation, feedback).
   - `piston_service.py`: Client for Piston API (live code execution and evaluation).
4. **Data Access Layer (`app/models/`, `app/database.py`)**: Manages the `motor` asynchronous MongoDB connections and Pydantic v2 Object-Document Mapping (ODM).
5. **Configuration Layer (`app/config.py`)**: Centralized `pydantic-settings` for environment variables.

### 2.2 Frontend Architecture
The frontend leverages React Context for global state and standard component hierarchy:
- `src/App.jsx`: Global routing (React Router) with Protected/Public route wrappers.
- `src/context/AuthContext.jsx`: Manages JWT token lifecycle and user profile state.
- `src/services/api.js`: Axios instance with automatic token injection and 401 redirect handling.
- `src/pages/`: Page-level components corresponding to the primary user flows.

## 3. Data Flow Diagrams

### 3.1 Adaptive Interview Flow
1. **Init**: User selects Job Role → Backend initializes session in Redis (`current_difficulty = 'easy'`).
2. **Fetch Question**: Backend selects a question from MongoDB matching the user's skill profile and current difficulty.
3. **Submit Answer**: User answers via text or voice.
4. **Evaluate**: Backend scores answer via `nlp_evaluator`.
5. **Adjust**: If average of last 2 scores > 7.5, difficulty increases. If < 4.0, difficulty decreases.
6. **Follow-up**: If ≥2 expected keywords are missed, Gemini generates a targeted follow-up question.

### 3.2 Live Coding Flow (Piston)
1. **Request**: Frontend sends source code, language ID, and standard input.
2. **Execute**: Backend submits payload to Piston API v2 endpoint.
3. **Score**: Output is evaluated, and a coding score is generated based on correctness and compilation status.

## 4. Database Schema (MongoDB)

### `questions` Collection
- `_id`: ObjectID
- `question`: String
- `topic`: String (e.g., Python, DBMS)
- `difficulty`: Enum (easy, medium, hard)
- `type`: Enum (intro, technical, behavioral, coding)
- `expected_keywords`: Array of Strings
- `ideal_answer`: String

### `sessions` Collection
- `_id`: ObjectID
- `user_id`: String
- `resume_id`: String
- `job_role`: String
- `status`: Enum (active, completed)
- `overall_score`: Float
- `answers`: Array of Subdocuments (stores candidate answer, scores, and Piston results)
- `weak_topics`: Array of Strings

### `roadmaps` Collection
- `_id`: ObjectID
- `session_id`: String
- `weeks`: Array of Subdocuments (topic, focus, daily tasks with resource links)

## 5. Security & Constraints
- **Code Execution**: Candidate code is NEVER executed on the application server. All code is sandboxed in Piston ephemeral containers.
- **Authentication**: Stateless JWT authentication with a 24-hour expiration. Passwords hashed via `bcrypt`.
- **Modularity**: LLM providers can be hot-swapped by replacing the `gemini_service.py` wrapper, ensuring no vendor lock-in.
