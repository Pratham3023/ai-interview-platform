# Setup & Deployment Guide

This guide covers setting up the Adaptive AI Interview Platform for local development and production deployment.

---

## 1. Local Development Setup

### System Requirements
- Node.js v18+ (LTS)
- Python 3.10+
- MongoDB Community Server (v7.0+)
- Redis Server (v7.0+)

### Backend Setup
1. **Clone and Virtual Environment:**
   ```bash
   cd backend
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```
2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```
3. **Configure Environment:**
   Copy `.env.example` to `.env` and fill in `GEMINI_API_KEY`. (Piston API is free and requires no key).
4. **Seed Database:**
   ```bash
   python seed_database.py
   ```
5. **Run Server:**
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. **Install Dependencies:**
   ```bash
   cd frontend
   npm install
   ```
2. **Run Dev Server:**
   ```bash
   npm run dev
   ```

---

## 2. Production Deployment (Docker/Cloud)

For production, the recommended architecture is:
- **Frontend**: Vercel or Netlify (Static Hosting).
- **Backend**: Render, Railway, or AWS App Runner.
- **Database**: MongoDB Atlas.
- **Cache**: Upstash Redis or AWS ElastiCache.

### Dockerizing the Backend
Create a `Dockerfile` in the `backend/` directory:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y gcc build-essential

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm

# Copy app code
COPY . .

# Run server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Environment Variables
When deploying to production, ensure the following are set securely:
- `DEBUG=False`
- `SECRET_KEY` = (A secure random 32+ character string)
- `ALLOWED_ORIGINS` = `https://your-frontend-domain.com`
- `MONGODB_URI` = `mongodb+srv://...`
- `REDIS_URL` = `rediss://...`

### Frontend Build
To build the frontend for production hosting:
```bash
cd frontend
npm run build
```
Upload the contents of the `dist/` directory to your static hosting provider.
