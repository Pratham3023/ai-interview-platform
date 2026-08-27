import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Briefcase, ChevronRight, Brain, Clock, BarChart3, AlertCircle, Wifi } from 'lucide-react'
import { interviewAPI } from '../services/api'
import api from '../services/api'
import toast from 'react-hot-toast'

const JOB_ROLES = [
  'Software Engineer', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
  'Data Engineer', 'Data Scientist', 'ML Engineer', 'DevOps Engineer',
  'System Design Engineer', 'Cloud Engineer',
]

export default function InterviewSetup() {
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const [jobRole, setJobRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [starting, setStarting] = useState(false)
  const [serverReady, setServerReady] = useState(false)

  // Ping backend on mount to wake up Render free tier from cold start
  useEffect(() => {
    let warmingToast = null
    const timer = setTimeout(() => {
      warmingToast = toast.loading('Warming up server... (first load may take ~30s)', { id: 'warm' })
    }, 2000)

    api.get('/health', { timeout: 60000 })
      .then(() => {
        clearTimeout(timer)
        toast.dismiss('warm')
        setServerReady(true)
      })
      .catch(() => {
        clearTimeout(timer)
        toast.dismiss('warm')
        setServerReady(true) // proceed anyway
      })

    return () => clearTimeout(timer)
  }, [])

  const finalRole = jobRole === 'custom' ? customRole : jobRole

  const handleStart = async () => {
    if (!finalRole) return toast.error('Please select a job role')
    setStarting(true)
    try {
      const data = await interviewAPI.start(resumeId, finalRole)
      toast.success('Interview started! Answer naturally.')
      navigate(`/interview/${data.session_id}`, { state: { firstQuestion: data.first_question } })
    } catch (err) {
      toast.error(err.message || 'Failed to start interview')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Interview Setup</h1>
        <p className="text-secondary">Configure your mock interview session. Questions will be tailored to your resume and chosen role.</p>
      </div>

      {/* Role Selection */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Briefcase size={20} style={{ color: '#6366f1' }} /> Target Job Role
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
          {JOB_ROLES.map(r => (
            <button key={r} onClick={() => setJobRole(r)}
              style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${jobRole === r ? '#6366f1' : 'var(--color-border)'}`, background: jobRole === r ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.03)', color: jobRole === r ? '#a5b4fc' : 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left' }}>
              {r}
            </button>
          ))}
          <button onClick={() => setJobRole('custom')}
            style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${jobRole === 'custom' ? '#6366f1' : 'var(--color-border)'}`, background: jobRole === 'custom' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.03)', color: jobRole === 'custom' ? '#a5b4fc' : 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
            ✏️ Custom Role
          </button>
        </div>
        {jobRole === 'custom' && (
          <input className="form-input" placeholder="e.g. Site Reliability Engineer"
            value={customRole} onChange={e => setCustomRole(e.target.value)} autoFocus />
        )}
      </div>

      {/* Info */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        {[
          { icon: Brain, label: 'Adaptive AI', desc: 'Questions adapt based on your answers in real-time' },
          { icon: Clock, label: '15 Questions', desc: 'Including 1 coding challenge via Judge0' },
          { icon: BarChart3, label: 'Full Scoring', desc: 'Technical, coding, communication & confidence' },
        ].map(item => (
          <div key={item.label} className="card" style={{ padding: 16 }}>
            <item.icon size={18} style={{ color: '#6366f1', marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
            <div className="text-secondary" style={{ fontSize: 12 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <AlertCircle size={16} style={{ color: '#f59e0b', marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: '#fcd34d', lineHeight: 1.5 }}>
          The interview will begin with <strong>"Introduce Yourself"</strong>. Speak clearly and naturally. Your voice characteristics will be analyzed as a confidence indicator (not a clinical assessment).
        </p>
      </div>

      <button onClick={handleStart} disabled={!finalRole || starting} className="btn btn-primary btn-lg btn-full">
        {starting ? <span className="spinner" style={{ width: 20, height: 20 }} /> : <><Brain size={20} /> Begin Interview <ChevronRight size={18} /></>}
      </button>
    </div>
  )
}
