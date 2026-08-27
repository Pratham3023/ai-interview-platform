import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { roadmapAPI } from '../services/api'
import { Map, BookOpen, Youtube, Code, ExternalLink, CheckCircle, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const SEVERITY_CONFIG = { very_weak: { label: 'Critical', color: '#ef4444', emoji: '🔴' }, moderately_weak: { label: 'Needs Work', color: '#f59e0b', emoji: '🟡' }, slightly_weak: { label: 'Minor Gap', color: '#06b6d4', emoji: '🔵' } }

const TYPE_ICON = { video: Youtube, practice: Code, book: BookOpen, article: BookOpen }

export default function Roadmap() {
  const { sessionId } = useParams()
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [completed, setCompleted] = useState({})

  useEffect(() => {
    roadmapAPI.getRoadmap(sessionId)
      .then(data => { setRoadmap(data); setExpanded({ 0: true }) })
      .catch(async () => {
        try { const d = await roadmapAPI.generate(sessionId); setRoadmap(d); setExpanded({ 0: true }) }
        catch (e) { toast.error(e.message) }
      })
      .finally(() => setLoading(false))
  }, [sessionId])

  const toggleWeek = (i) => setExpanded(e => ({ ...e, [i]: !e[i] }))
  const toggleTask = (key) => setCompleted(c => ({ ...c, [key]: !c[key] }))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
      <p className="text-secondary">Building your personalized roadmap...</p>
    </div>
  )

  if (!roadmap || roadmap.weeks.length === 0) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <Map size={48} style={{ color: '#6366f1', margin: '0 auto 16px' }} />
      <h2 style={{ fontSize: 22 }}>No roadmap found</h2>
      <p className="text-secondary">Complete an interview to generate a personalized learning roadmap.</p>
    </div>
  )

  const completedCount = Object.values(completed).filter(Boolean).length
  const totalTasks = roadmap.weeks.reduce((s, w) => s + (w.daily_tasks?.length || 0), 0)

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Map size={28} style={{ color: '#6366f1' }} />
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Learning Roadmap</h1>
        </div>
        <p className="text-secondary">Personalized {roadmap.total_weeks}-week study plan for {roadmap.job_role} — ordered by prerequisites</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Weeks', value: roadmap.total_weeks, color: '#6366f1' },
          { label: 'Topics to Cover', value: roadmap.weak_topics?.length || 0, color: '#ef4444' },
          { label: 'Tasks Done', value: `${completedCount}/${totalTasks}`, color: '#10b981' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div className="text-secondary text-sm" style={{ marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {totalTasks > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>Overall Progress</span>
            <span className="text-secondary">{Math.round((completedCount / totalTasks) * 100)}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${(completedCount / totalTasks) * 100}%` }} /></div>
        </div>
      )}

      {/* Week Plans */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {roadmap.weeks.map((week, i) => {
          const sev = SEVERITY_CONFIG[week.severity] || SEVERITY_CONFIG.slightly_weak
          const isOpen = expanded[i]
          const weekCompleted = week.daily_tasks?.filter(t => completed[`${i}-${t.day}`]).length || 0

          return (
            <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Week Header */}
              <button onClick={() => toggleWeek(i)} style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 24px', textAlign: 'left', color: 'var(--text-primary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${sev.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {sev.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Week {week.week}: {week.topic}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{week.focus}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="badge" style={{ background: `${sev.color}22`, color: sev.color, fontSize: 11 }}>{sev.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{weekCompleted}/{week.daily_tasks?.length || 0}</span>
                  <ChevronDown size={18} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </div>
              </button>

              {/* Week Content */}
              {isOpen && (
                <div style={{ padding: '0 24px 20px', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
                    {week.daily_tasks?.map((task) => {
                      const taskKey = `${i}-${task.day}`
                      const done = completed[taskKey]
                      const Icon = TYPE_ICON[task.resource_type] || BookOpen
                      return (
                        <div key={task.day} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 10, background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'var(--color-border)'}`, cursor: 'pointer', transition: 'all 0.15s' }}
                          onClick={() => toggleTask(taskKey)}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? '#10b981' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                            {done ? <CheckCircle size={14} style={{ color: '#fff' }} /> : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>D{task.day}</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none' }}>{task.task}</span>
                          </div>
                          {task.resource_url && (
                            <a href={task.resource_url} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6366f1', whiteSpace: 'nowrap' }}>
                              <Icon size={13} /> Resource <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 13, color: '#a5b4fc', lineHeight: 1.6 }}>
        💡 <strong>Roadmap powered by NetworkX DAG.</strong> Topics are ordered by prerequisites — complete foundational topics first for maximum learning efficiency. Check off tasks as you complete them to track your progress.
      </div>
    </div>
  )
}
