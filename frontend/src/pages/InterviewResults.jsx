import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { scoringAPI, feedbackAPI, roadmapAPI } from '../services/api'
import { RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { verdictLine } from '../components/Marks'

export default function InterviewResults() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [scores, setScores]       = useState(null)
  const [feedback, setFeedback]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [genFeedback, setGenFeedback] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        let s = await scoringAPI.getScores(sessionId).catch(() => null)
        if (!s || s.overall_score === 0) s = await scoringAPI.compute(sessionId)
        setScores(s)
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
      toast.success('Feedback written')
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
    <div className="page-wrapper-md" aria-busy="true" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: '50vh' }}>
      <span className="spinner" />
      <p>Marking your answers…</p>
    </div>
  )

  if (!scores) return (
    <div className="page-wrapper-md">
      <h1 style={{ marginBottom: 8 }}>No report for this interview</h1>
      <p style={{ marginBottom: 20 }}>It may not have been finished. Start a new one from your dashboard.</p>
      <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">Go to dashboard</button>
    </div>
  )

  const overall = scores.overall_score || 0
  const weakSet = new Set(scores.weak_topics || [])
  const topics  = Object.entries(scores.topic_scores || {})
    .map(([topic, score]) => ({ topic, score: Math.round(score) }))
    .sort((a, b) => a.score - b.score)

  const dims = [
    { label: 'Aptitude',       value: scores.aptitude_score },
    { label: 'Role questions', value: scores.role_mcq_score },
    { label: 'Follow-ups',     value: scores.adaptive_score },
    ...(scores.coding_score && scores.coding_score > 0 ? [{ label: 'Coding', value: scores.coding_score }] : []),
  ]

  return (
    <div className="page-wrapper">
      <div className="flex-between page-head" style={{ flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <div>
          <h1>Your report</h1>
          <p>How the interview went, and what to work on next.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/upload')} className="btn btn-secondary">
            <RotateCcw size={15} /> New interview
          </button>
          {scores.weak_topics?.length > 0 && (
            <button onClick={handleGenerateRoadmap} className="btn btn-primary">Open study plan</button>
          )}
        </div>
      </div>

      <section className="verdict margin-b-6" aria-label="Overall result">
        <div>
          <div className="verdict-who">The interviewer’s verdict</div>
          <p className="verdict-line">{verdictLine(overall)}</p>
        </div>
        <div className="verdict-score">
          <div className="verdict-num">{Math.round(overall)}</div>
          <div className="verdict-of">out of 100</div>
        </div>
      </section>

      <div className="figures margin-b-8" style={{ gridTemplateColumns: `repeat(${dims.length}, minmax(0, 1fr))` }}>
        {dims.map(d => {
          const v = Math.round(d.value || 0)
          return (
            <div key={d.label} className="figure">
              <div className="label">{d.label}</div>
              <div className="figure-value">{v}</div>
              <div className="bar-track" style={{ marginTop: 10, height: 6 }}>
                <div className="bar-fill" style={{ width: `${v}%`, background: v < 55 ? 'linear-gradient(90deg, var(--orange), var(--amber))' : '#D4D4D8' }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid-2 margin-b-8" style={{ alignItems: 'start' }}>
        {topics.length > 0 && (
          <div className="sheet">
            <div className="section-header">
              <h2 className="section-title">Topics, weakest first</h2>
              {weakSet.size > 0 && <span className="label">Highlighted ones need work</span>}
            </div>
            {topics.map(t => (
              <div key={t.topic} className={'bar-row' + (weakSet.has(t.topic) ? ' is-weak' : '')}>
                <span>{weakSet.has(t.topic) ? <span className="hl">{t.topic}</span> : t.topic}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${t.score}%` }} /></div>
                <span className="bar-value">{t.score}</span>
              </div>
            ))}
          </div>
        )}

        <div className="sheet">
          <h2 className="section-title" style={{ marginBottom: 16 }}>Where you stand</h2>
          {scores.strong_topics?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div className="label" style={{ marginBottom: 8 }}>Solid</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {scores.strong_topics.map(t => <span key={t} className="badge badge-success">{t}</span>)}
              </div>
            </div>
          )}
          {scores.weak_topics?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="label" style={{ marginBottom: 8 }}>Needs work</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {scores.weak_topics.map(t => <span key={t} className="badge badge-error">{t}</span>)}
              </div>
            </div>
          )}
          {scores.weak_topics?.length > 0 ? (
            <div className="callout callout-info">
              <div>
                <p style={{ marginBottom: 10 }}>
                  Your study plan covers {scores.weak_topics.length === 1 ? 'this topic' : `these ${scores.weak_topics.length} topics`}, basics first.
                </p>
                <button onClick={handleGenerateRoadmap} className="btn btn-primary btn-sm">Open study plan</button>
              </div>
            </div>
          ) : (
            <p>No weak topics this time. Try a more demanding role to stretch yourself.</p>
          )}
        </div>
      </div>

      <div className="sheet">
        <div className="section-header">
          <h2 className="section-title">Written feedback</h2>
          {!feedback && (
            <button onClick={handleGenerateFeedback} disabled={genFeedback} className="btn btn-primary btn-sm">
              {genFeedback ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Writing…</> : 'Write feedback'}
            </button>
          )}
        </div>

        {feedback ? (
          <div className="feedback">
            <p className="feedback-summary">{feedback.overall_summary}</p>

            <div className="grid-2">
              <div>
                <h3 className="feedback-h">What went well</h3>
                <ul className="feedback-list is-good">
                  {feedback.strengths?.map(s => <li key={s}>{s}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="feedback-h">What to fix</h3>
                <ul className="feedback-list is-fix">
                  {feedback.weaknesses?.map(w => <li key={w}>{w}</li>)}
                </ul>
              </div>
            </div>

            {feedback.improvement_suggestions?.length > 0 && (
              <div>
                <h3 className="feedback-h">Do this next</h3>
                <ol className="feedback-steps">
                  {feedback.improvement_suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}

            {feedback.technical_feedback && (
              <div>
                <h3 className="feedback-h">On the technical answers</h3>
                <p style={{ maxWidth: '72ch' }}>{feedback.technical_feedback}</p>
              </div>
            )}
          </div>
        ) : (
          <p>Get a written summary of your answers: what went well, what to fix, and what to do next.</p>
        )}
      </div>
    </div>
  )
}
