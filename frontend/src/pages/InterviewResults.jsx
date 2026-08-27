import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { scoringAPI, feedbackAPI, roadmapAPI } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { Trophy, TrendingDown, Map, ChevronRight, Download, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

const SCORE_COLOR = (s) => s >= 75 ? '#10b981' : s >= 55 ? '#f59e0b' : '#ef4444'

function ScoreGauge({ score, label, color }) {
  const r = 45, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
        <circle cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        <text x={60} y={60} fill="#fff" textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 20, fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: '60px 60px' }}>
          {Math.round(score)}
        </text>
      </svg>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function InterviewResults() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [scores, setScores] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)
  const [genFeedback, setGenFeedback] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        // Try to get existing scores, compute if missing
        let s = await scoringAPI.getScores(sessionId).catch(() => null)
        if (!s || s.overall_score === 0) s = await scoringAPI.compute(sessionId)
        setScores(s)

        // Try to get existing feedback
        const fb = await feedbackAPI.getFeedback(sessionId).catch(() => null)
        setFeedback(fb)
      } catch (e) {
        toast.error(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  const handleGenerateFeedback = async () => {
    setGenFeedback(true)
    try {
      const fb = await feedbackAPI.generate(sessionId)
      setFeedback(fb)
      toast.success('AI feedback generated!')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGenFeedback(false)
    }
  }

  const handleGenerateRoadmap = async () => {
    try {
      await roadmapAPI.generate(sessionId)
      navigate(`/roadmap/${sessionId}`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
      <p className="text-secondary">Computing your scores...</p>
    </div>
  )

  if (!scores) return <div style={{ textAlign: 'center', padding: 60 }}><p>No data found for this session.</p></div>

  const topicBarData = Object.entries(scores.topic_scores || {}).map(([topic, score]) => ({ topic, score: Math.round(score) }))
  const radarData = topicBarData.slice(0, 8)
  const overall = scores.overall_score || 0
  const overallColor = SCORE_COLOR(overall)

  const scoreDims = [
    { label: 'Technical', value: scores.technical_score, color: '#6366f1' },
    { label: 'Coding', value: scores.coding_score, color: '#06b6d4' },
    { label: 'Answer Quality', value: scores.answer_quality_score, color: '#a855f7' },
    { label: 'Communication', value: scores.communication_score, color: '#10b981' },
    { label: 'Confidence', value: scores.confidence_indicator, color: '#f59e0b' },
    { label: 'Keywords', value: scores.keyword_coverage_score, color: '#ec4899' },
  ]

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Interview Results</h1>
          <p className="text-secondary">Your complete performance analysis</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/upload')} className="btn btn-secondary"><RotateCcw size={16} /> New Interview</button>
          {scores.weak_topics?.length > 0 && (
            <button onClick={handleGenerateRoadmap} className="btn btn-primary"><Map size={16} /> View Roadmap <ChevronRight size={16} /></button>
          )}
        </div>
      </div>

      {/* Overall Score */}
      <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: 40, background: `${overallColor}08`, border: `1px solid ${overallColor}30` }}>
        <Trophy size={40} style={{ color: overallColor, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 72, fontWeight: 800, color: overallColor, lineHeight: 1 }}>{Math.round(overall)}</div>
        <div style={{ fontSize: 20, color: 'var(--text-secondary)', marginBottom: 8 }}>out of 100</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{overall >= 85 ? '🏆 Excellent!' : overall >= 70 ? '✅ Good Job' : overall >= 55 ? '📈 Keep Going' : '📚 Needs Focus'}</div>
      </div>

      {/* Dimension Scores */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Score Breakdown</h2>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16 }}>
          {scoreDims.map(d => <ScoreGauge key={d.label} score={d.value || 0} label={d.label} color={d.color} />)}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Topic Bar Chart */}
        {topicBarData.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Topic Scores</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topicBarData} margin={{ left: -20 }}>
                <XAxis dataKey="topic" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }} />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weak / Strong Topics */}
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Topic Classification</h2>
          {scores.strong_topics?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>✅ Strong Topics</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {scores.strong_topics.map(t => <span key={t} className="badge badge-success">{t}</span>)}
              </div>
            </div>
          )}
          {scores.weak_topics?.length > 0 && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingDown size={14} /> Areas to Improve
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {scores.weak_topics.map(t => <span key={t} className="badge badge-error">{t}</span>)}
              </div>
            </div>
          )}
          {scores.weak_topics?.length > 0 && (
            <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
              <p style={{ fontSize: 13, color: '#a5b4fc' }}>💡 A personalized study roadmap is ready for your weak topics.</p>
              <button onClick={handleGenerateRoadmap} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
                <Map size={14} /> Generate Roadmap
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Feedback */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>AI Feedback Report</h2>
          {!feedback && (
            <button onClick={handleGenerateFeedback} disabled={genFeedback} className="btn btn-primary btn-sm">
              {genFeedback ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Generate AI Feedback'}
            </button>
          )}
        </div>

        {feedback ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: 16, background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
              <p style={{ fontSize: 15, lineHeight: 1.8 }}>{feedback.overall_summary}</p>
            </div>

            <div className="grid-2">
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#10b981', marginBottom: 10 }}>💪 Strengths</p>
                {feedback.strengths?.map(s => (
                  <div key={s} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#10b981' }}>✓</span><span>{s}</span>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', marginBottom: 10 }}>🎯 Areas for Improvement</p>
                {feedback.weaknesses?.map(w => (
                  <div key={w} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: '#ef4444' }}>→</span><span>{w}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#06b6d4', marginBottom: 10 }}>💡 Actionable Suggestions</p>
              {feedback.improvement_suggestions?.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#06b6d4', flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.6 }}>{s}</span>
                </div>
              ))}
            </div>

            {feedback.technical_feedback && (
              <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10, fontSize: 13, lineHeight: 1.7 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Technical: </span>{feedback.technical_feedback}
              </div>
            )}
          </div>
        ) : (
          <p className="text-secondary" style={{ fontSize: 14 }}>Generate your personalized AI feedback report.</p>
        )}
      </div>
    </div>
  )
}
