import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { dashboardAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, Tooltip,
} from 'recharts'
import toast from 'react-hot-toast'
import { verdictLine } from '../components/Marks'

const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export default function Dashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.getDashboard()
      .then(setData)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page-wrapper" aria-busy="true">
      <div className="skeleton margin-b-8" style={{ height: 34, width: 260 }} />
      <div className="skeleton margin-b-8" style={{ height: 96 }} />
      <div className="grid-2">
        <div className="skeleton" style={{ height: 260 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    </div>
  )

  const sessions    = data?.all_sessions || []
  const latest      = data?.latest_session
  const topicScores = latest?.topic_scores || {}
  const radarData   = Object.entries(topicScores).map(([topic, score]) => ({
    topic: topic.slice(0, 12), score: Math.round(score),
  }))
  const historyData = sessions.slice(0, 10).reverse().map((s, i) => ({
    attempt: i + 1, score: Math.round(s.overall_score),
  }))

  const figures = [
    { label: 'Interviews taken', value: data?.total_sessions || 0 },
    { label: 'Best score',       value: Math.round(data?.best_score || 0) },
    { label: 'Average score',    value: Math.round(data?.average_score || 0) },
    { label: 'Weak topics now',  value: latest?.weak_topics?.length || 0 },
  ]
  const firstName = user?.full_name?.split(' ')[0]

  return (
    <div className="page-wrapper">
      <div className="flex-between page-head" style={{ flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <div>
          <h1>{firstName ? `Hello, ${firstName}` : 'Your dashboard'}</h1>
          <p>
            {sessions.length
              ? 'How your mock interviews have gone so far.'
              : 'You haven’t taken a mock interview yet.'}
          </p>
        </div>
        <Link to="/upload" className="btn btn-primary">New interview</Link>
      </div>

      {sessions.length === 0 ? (
        <div className="sheet" style={{ padding: '44px 40px', maxWidth: 640 }}>
          <h2 style={{ marginBottom: 10 }}>Start with your resume</h2>
          <p style={{ marginBottom: 24, maxWidth: '52ch' }}>
            Upload a PDF and pick the role you’re preparing for. You’ll answer 35 questions
            and get a marked report with a study plan at the end.
          </p>
          <Link to="/upload" className="btn btn-primary">Upload resume</Link>
        </div>
      ) : (
        <>
          <div className="figures margin-b-8">
            {figures.map(f => (
              <div key={f.label} className="figure">
                <div className="label">{f.label}</div>
                <div className="figure-value">{f.value}</div>
              </div>
            ))}
          </div>

          <div className="grid-7-5 margin-b-8">
            {latest && (
              <div className="sheet">
                <div className="section-header">
                  <h2 className="section-title">Latest interview</h2>
                  <Link to={`/results/${latest.session_id}`} className="btn btn-secondary btn-sm">View report</Link>
                </div>
                <p className="voice" style={{ fontSize: '1.25rem', lineHeight: 1.3, marginBottom: 20, maxWidth: '30ch' }}>
                  {verdictLine(latest.overall_score)}
                </p>
                <div style={{ display: 'flex', gap: 28, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <div className="figure-value" style={{ fontSize: '3rem', lineHeight: 1 }}>{Math.round(latest.overall_score)}</div>
                    <div className="label">out of 100</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 600 }}>{latest.job_role}</div>
                    <div className="text-secondary" style={{ fontSize: '0.92rem' }}>{fmtDate(latest.created_at)}</div>
                  </div>
                </div>
                {latest.weak_topics?.length > 0 && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                    <div className="label" style={{ marginBottom: 8 }}>Work on next</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {latest.weak_topics.slice(0, 3).map(t => <span key={t} className="hl">{t}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {radarData.length > 0 && (
              <div className="sheet">
                <h2 className="section-title margin-b-4">Scores by topic</h2>
                <ResponsiveContainer width="100%" height={230}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#30333A" />
                    <PolarAngleAxis dataKey="topic" tick={{ fill: '#A3A3AD', fontSize: 12 }} />
                    <Radar name="Score" dataKey="score" stroke="#FF8240" strokeWidth={2} fill="#FF6A2B" fillOpacity={0.22} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {historyData.length > 1 && (
            <div className="sheet margin-b-8">
              <h2 className="section-title margin-b-4">Score over time</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={historyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <XAxis
                    dataKey="attempt"
                    tick={{ fill: '#7C7C86', fontSize: 12 }}
                    axisLine={{ stroke: '#30333A' }}
                    tickLine={false}
                    tickFormatter={(v) => `#${v}`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#181A1F', border: '1px solid #30333A', borderRadius: 8, fontSize: 13, color: '#F5F5F4' }}
                    itemStyle={{ color: '#fff' }}
                    labelFormatter={(v) => `Interview ${v}`}
                  />
                  <Area
                    type="linear" dataKey="score" stroke="#FF8240" fill="#FF6A2B" fillOpacity={0.1} strokeWidth={2}
                    dot={{ r: 3, fill: '#FF8240', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#FFB15C', stroke: '#08090B', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="sheet">
            <div className="section-header">
              <h2 className="section-title">All interviews</h2>
              <span className="label">{sessions.length} total</span>
            </div>
            <div className="history-head" aria-hidden="true">
              <span>Role</span><span>Date</span><span>Status</span><span style={{ textAlign: 'right' }}>Score</span><span />
            </div>
            <div className="rows">
              {sessions.slice(0, 8).map(s => (
                <button
                  key={s.session_id}
                  type="button"
                  className="row history-row"
                  onClick={() => navigate(`/results/${s.session_id}`)}
                >
                  <span style={{ fontWeight: 600 }}>{s.job_role}</span>
                  <span className="text-secondary">{fmtDate(s.created_at)}</span>
                  <span>
                    <span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {s.status === 'completed' ? 'Completed' : 'In progress'}
                    </span>
                  </span>
                  <span className="tabular" style={{ textAlign: 'right', fontWeight: 650 }}>{Math.round(s.overall_score)}</span>
                  <ChevronRight size={16} className="text-muted" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
