# API Documentation

The backend exposes a RESTful API powered by FastAPI. 
Interactive documentation is available locally at: `http://localhost:8000/docs`

All protected endpoints require an `Authorization: Bearer <token>` header.

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Registers a new user.
- **Body**: `{ "email": "user@example.com", "password": "...", "full_name": "..." }`
- **Returns**: `{ "access_token": "...", "user_id": "...", ... }`

### `POST /api/auth/login`
Authenticates a user. Uses OAuth2 `x-www-form-urlencoded` format.
- **Body**: `username=user@example.com&password=...`
- **Returns**: `{ "access_token": "...", "user_id": "...", ... }`

### `GET /api/auth/me` (Protected)
Gets current user profile.
- **Returns**: User object.

---

## 2. Resume Processing (`/api/resume`)

### `POST /api/resume/upload` (Protected)
Uploads a PDF resume and extracts the technical skill profile.
- **Body**: `multipart/form-data` with key `file`
- **Returns**: `{ "resume_id": "...", "skill_profile": { "Python": ["Django"], ... }, "total_skills_detected": 15 }`

---

## 3. Interview Session (`/api/interview`)

### `POST /api/interview/start` (Protected)
Starts a new adaptive interview session.
- **Body**: `{ "resume_id": "...", "job_role": "Software Engineer" }`
- **Returns**: `{ "session_id": "...", "first_question": { ... } }`

### `POST /api/interview/answer` (Protected)
Submits an answer and triggers evaluation and adaptive progression.
- **Body**: 
  ```json
  {
    "session_id": "...",
    "question_id": "...",
    "answer_text": "My answer here",
    "is_follow_up": false
  }
  ```
- **Returns**: 
  ```json
  {
    "evaluation": { "keyword_score": 8.5, ... },
    "next_question": { ... }, // Null if session complete
    "session_complete": false
  }
  ```

---

## 4. Code Execution (`/api/coding`)

### `POST /api/coding/submit` (Protected)
Executes code via Piston API.
- **Body**: 
  ```json
  {
    "session_id": "...",
    "question_id": "...",
    "code": "print('Hello')",
    "language_id": "python",
    "stdin": ""
  }
  ```
- **Returns**: `{ "status": "Accepted", "stdout": "Hello\n", "coding_score": 10.0, ... }`

---

## 5. Results & Analytics (`/api/...`)

### `POST /api/scoring/{session_id}/compute` (Protected)
Computes final multi-dimensional scores after session completion.
- **Returns**: `{ "overall_score": 82.5, "weak_topics": ["Docker"], ... }`

### `POST /api/feedback/{session_id}/generate` (Protected)
Uses Gemini AI to generate a detailed qualitative feedback report.
- **Returns**: `{ "overall_summary": "...", "strengths": [...], "weaknesses": [...] }`

### `POST /api/roadmap/{session_id}/generate` (Protected)
Generates a personalized study roadmap ordered by NetworkX DAG prerequisites.
- **Returns**: `{ "weeks": [ { "topic": "Docker", "daily_tasks": [...] } ], ... }`

### `GET /api/dashboard/` (Protected)
Returns aggregated user statistics and interview history.
- **Returns**: `{ "total_sessions": 5, "average_score": 76.5, "latest_session": { ... }, "all_sessions": [...] }`
