import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, BarChart3, Clock, ChevronRight, TrendingUp, Award, Target } from 'lucide-react'
import { dashboardAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import toast from 'react-hot-toast'

const STATUS_COLOR = { strong: '#10b981', needs_improvement: '#f59e0b', weak: '#ef4444' }

function ScoreCircle({ score, size = 120, color = '#6366f1' }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={size/2} y={size/2} fill="#fff" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: size * 0.22, fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {Math.round(score)}
      </text>
    </svg>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.getDashboard()
      .then(setData)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
    </div>
  )

  const sessions = data?.all_sessions || []
  const latest = data?.latest_session
  const topicScores = latest?.topic_scores || {}

  const radarData = Object.entries(topicScores).map(([topic, score]) => ({ topic: topic.slice(0, 8), score: Math.round(score) }))
  const historyData = sessions.slice(0, 10).reverse().map((s, i) => ({ attempt: i + 1, score: Math.round(s.overall_score) }))

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Welcome back, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-secondary">Track your progress and keep improving</p>
        </div>
        <Link to="/upload" className="btn btn-primary btn-lg">
          <Plus size={18} /> New Interview
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {[
          { icon: BarChart3, label: 'Total Sessions', value: data?.total_sessions || 0, color: '#6366f1' },
          { icon: Award, label: 'Best Score', value: `${Math.round(data?.best_score || 0)}%`, color: '#10b981' },
          { icon: TrendingUp, label: 'Average Score', value: `${Math.round(data?.average_score || 0)}%`, color: '#06b6d4' },
          { icon: Target, label: 'Weak Topics', value: latest?.weak_topics?.length || 0, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={22} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
              <div className="text-secondary text-sm">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 ? (
        /* Empty State */
        <div className="card" style={{ textAlign: 'center', padding: 64 }}>
          <BarChart3 size={48} style={{ color: '#6366f1', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>No interviews yet</h2>
          <p className="text-secondary" style={{ marginBottom: 24 }}>Upload your resume and start your first AI-powered mock interview</p>
          <Link to="/upload" className="btn btn-primary btn-lg">
            <Plus size={18} /> Start First Interview
          </Link>
        </div>
      ) : (
        <div className="grid-2" style={{ marginBottom: 32 }}>
          {/* Latest Score */}
          {latest && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>Latest Performance</h2>
                <Link to={`/results/${latest.session_id}`} className="btn btn-secondary btn-sm">View Details <ChevronRight size={14} /></Link>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                <ScoreCircle score={latest.overall_score} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>Overall Score</div>
                  <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>{Math.round(latest.overall_score)}<span style={{ fontSize: 18, color: 'var(--text-muted)' }}>/100</span></div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{latest.job_role} · {new Date(latest.created_at).toLocaleDateString()}</div>
                  {latest.weak_topics?.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {latest.weak_topics.slice(0, 3).map(t => <span key={t} className="badge badge-error">{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Radar Chart */}
          {radarData.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Topic Performance</h2>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                  <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Score History */}
      {historyData.length > 1 && (
        <div className="card" style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Score Progression</h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="attempt" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#scoreGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Session History */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Interview History</h2>
          <span className="text-secondary text-sm">{sessions.length} sessions</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.slice(0, 8).map(s => (
            <div key={s.session_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, cursor: 'pointer' }}
              onClick={() => navigate(`/results/${s.session_id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                  {Math.round(s.overall_score)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.job_role}</div>
                  <div className="text-muted text-xs">{new Date(s.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
