/**
 * API Service — Axios client for FastAPI backend
 * All API calls go through this module.
 * Base URL is configured via environment variable.
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Auth Token Injection ───────────────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response Error Handling ────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'

    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    return Promise.reject(new Error(message))
  }
)

// ── Auth API ───────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (email, password) => {
    const form = new FormData()
    form.append('username', email)
    form.append('password', password)
    return api.post('/api/auth/login', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getMe: () => api.get('/api/auth/me'),
}

// ── Resume API ─────────────────────────────────────────────────────────────

export const resumeAPI = {
  upload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/resume/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getResume: (resumeId) => api.get(`/api/resume/${resumeId}`),
  listResumes: () => api.get('/api/resume/'),
}

// ── Interview API ──────────────────────────────────────────────────────────

export const interviewAPI = {
  start: (resumeId, jobRole) =>
    api.post('/api/interview/start', { resume_id: resumeId, job_role: jobRole }),
  submitAnswer: (data) => api.post('/api/interview/answer', data),
  getSession: (sessionId) => api.get(`/api/interview/${sessionId}`),
  listSessions: () => api.get('/api/interview/'),
}

// ── Coding API ─────────────────────────────────────────────────────────────

export const codingAPI = {
  submit: (data) => api.post('/api/coding/submit', data),
  getLanguages: () => api.get('/api/coding/languages'),
}

// ── Scoring API ────────────────────────────────────────────────────────────

export const scoringAPI = {
  compute: (sessionId) => api.post(`/api/scoring/${sessionId}/compute`),
  getScores: (sessionId) => api.get(`/api/scoring/${sessionId}`),
}

// ── Feedback API ───────────────────────────────────────────────────────────

export const feedbackAPI = {
  generate: (sessionId) => api.post(`/api/feedback/${sessionId}/generate`),
  getFeedback: (sessionId) => api.get(`/api/feedback/${sessionId}`),
}

// ── Roadmap API ────────────────────────────────────────────────────────────

export const roadmapAPI = {
  generate: (sessionId) => api.post(`/api/roadmap/${sessionId}/generate`),
  getRoadmap: (sessionId) => api.get(`/api/roadmap/${sessionId}`),
}

// ── Dashboard API ──────────────────────────────────────────────────────────

export const dashboardAPI = {
  getDashboard: () => api.get('/api/dashboard/'),
}

export default api
