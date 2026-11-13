import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { roadmapAPI } from '../services/api'
import { Check, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Roadmap() {
  const { sessionId } = useParams()
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState({})

  useEffect(() => {
    roadmapAPI.get(sessionId)
      .then(data => {
        setRoadmap(data)
        const init = {}
        const topics = (data.ordered_topics && data.ordered_topics.length > 0)
          ? data.ordered_topics
          : (data.weeks?.map(w => ({ topic: w.topic })) || [])
        topics.forEach(t => { init[t.topic] = false })
        setChecked(init)
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  const toggle = (topic) => setChecked(p => ({ ...p, [topic]: !p[topic] }))

  const total     = Object.keys(checked).length
  const completed = Object.values(checked).filter(Boolean).length

  if (loading) return (
    <div className="page-wrapper-md" aria-busy="true">
      <div className="skeleton" style={{ height: 34, width: 240, marginBottom: 32 }} />
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ marginBottom: 10, height: 64 }} />)}
    </div>
  )

  if (!roadmap) return (
    <div className="page-wrapper-md">
      <h1 style={{ marginBottom: 8 }}>No study plan yet</h1>
      <p style={{ marginBottom: 20 }}>Open the report for this interview and choose “Open study plan” to make one.</p>
      <Link to={`/results/${sessionId}`} className="btn btn-secondary">Back to report</Link>
    </div>
  )

  const displayTopics = (roadmap?.ordered_topics && roadmap.ordered_topics.length > 0)
    ? roadmap.ordered_topics
    : (roadmap?.weeks?.map(w => ({
        topic: w.topic,
        domain: w.topic,
        resources: w.daily_tasks?.map(d => ({ title: d.task, url: d.resource_url })).filter(r => r.url) || [],
      })) || [])

  return (
    <div className="page-wrapper-md">
      <div className="page-head">
        <h1>Your study plan</h1>
        <p>Work top to bottom. Each topic builds on the ones above it.</p>
      </div>

      <div className="sheet" style={{ marginBottom: 20, padding: '18px 24px' }}>
        <div className="flex-between" style={{ marginBottom: 10 }}>
          <span style={{ fontWeight: 600 }}>Progress</span>
          <span className="tabular text-secondary">{completed} of {total} done</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%', transition: 'width 0.4s ease-out' }}
          />
        </div>
      </div>

      <ol className="sheet plan" style={{ padding: '4px 24px' }}>
        {displayTopics.map(item => {
          const done = checked[item.topic]
          return (
            <li key={item.topic} className={'plan-item' + (done ? ' is-done' : '')}>
              <button
                type="button"
                className="plan-check"
                onClick={() => toggle(item.topic)}
                aria-pressed={!!done}
                aria-label={`Mark ${item.topic} as ${done ? 'not done' : 'done'}`}
              >
                {done && <Check size={14} strokeWidth={3} />}
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span className="plan-title">{item.topic}</span>
                  {item.domain && item.domain !== item.topic && (
                    <span className="label">{item.domain}</span>
                  )}
                </div>
                {item.resources?.length > 0 && (
                  <div className="plan-links">
                    {item.resources.slice(0, 2).map(r => (
                      <a key={r.title} href={r.url} target="_blank" rel="noopener noreferrer">
                        {r.title} <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <p className="form-hint" style={{ marginTop: 16 }}>
        Ticks are saved in this tab only. When you’ve worked through the list, take another interview to see what changed.
      </p>
    </div>
  )
}
