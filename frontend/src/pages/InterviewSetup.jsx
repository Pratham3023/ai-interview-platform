import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { interviewAPI } from '../services/api'
import toast from 'react-hot-toast'

const JOB_ROLES = [
  'Software Engineer', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
  'Data Engineer', 'Data Scientist', 'ML Engineer', 'DevOps Engineer',
  'System Design Engineer', 'Cloud Engineer',
]

export default function InterviewSetup() {
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const [jobRole, setJobRole]       = useState('')
  const [customRole, setCustomRole] = useState('')
  const [starting, setStarting]     = useState(false)
  const [serverReady, setServerReady] = useState(false)

  useEffect(() => {
    let warmingToast = null
    const timer = setTimeout(() => {
      warmingToast = toast.loading('Waking up the interview server. This can take up to a minute…', { id: 'warm' })
    }, 2000)
    api.get('/health', { timeout: 60000 })
      .then(() => { clearTimeout(timer); toast.dismiss('warm'); setServerReady(true) })
      .catch(() => { clearTimeout(timer); toast.dismiss('warm'); setServerReady(true) })
    return () => clearTimeout(timer)
  }, [])

  const finalRole = jobRole === 'custom' ? customRole : jobRole

  const handleStart = async () => {
    if (!finalRole) return toast.error('Pick a role first')
    setStarting(true)
    try {
      const data = await interviewAPI.start(resumeId, finalRole)
      toast.success('Interview started')
      navigate(`/interview/${data.session_id}`, {
        replace: true,
        state: { firstQuestion: data.first_question, allNavigableQuestions: data.all_navigable_questions },
      })
    } catch (err) {
      toast.error(err.message || 'Couldn’t start the interview. Try again.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="page-wrapper-md">
      <ol className="flow-steps" aria-label="Interview setup">
        <li className="is-done">Resume</li>
        <li aria-current="step">Role</li>
        <li>Interview</li>
      </ol>

      <div className="page-head">
        <h1>Which role are you preparing for?</h1>
        <p>The second set of questions, and the follow-ups, are written for this role.</p>
      </div>

      <fieldset className="sheet" style={{ marginBottom: 24 }}>
        <legend className="visually-hidden">Target role</legend>
        <div className="role-grid">
          {JOB_ROLES.map(r => (
            <button
              key={r}
              type="button"
              className="choice"
              aria-pressed={jobRole === r}
              onClick={() => setJobRole(r)}
            >
              <span className="choice-dot" aria-hidden="true" />
              {r}
            </button>
          ))}
          <button
            type="button"
            className="choice"
            aria-pressed={jobRole === 'custom'}
            onClick={() => setJobRole('custom')}
          >
            <span className="choice-dot" aria-hidden="true" />
            Something else
          </button>
        </div>

        {jobRole === 'custom' && (
          <div className="form-group" style={{ marginTop: 18 }}>
            <label className="form-label" htmlFor="custom-role">Role title</label>
            <input
              id="custom-role"
              className="form-input"
              placeholder="e.g. Site Reliability Engineer"
              value={customRole}
              onChange={e => setCustomRole(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </fieldset>

      <div className="sheet session-outline" style={{ marginBottom: 28 }}>
        <h2 className="section-title" style={{ marginBottom: 12 }}>What you’ll answer</h2>
        <ol>
          <li><strong>15 aptitude questions.</strong> Multiple choice, any order.</li>
          <li><strong>15 role questions.</strong> Multiple choice on {finalRole || 'your chosen role'}.</li>
          <li><strong>5 follow-ups.</strong> Written answers, aimed at whatever you found hardest. You can speak instead of typing.</li>
        </ol>
      </div>

      <button
        onClick={handleStart}
        disabled={!finalRole || starting}
        className="btn btn-primary btn-lg"
        style={{ minWidth: 220 }}
      >
        {starting ? <><span className="spinner" /> Starting…</> : 'Start interview'}
      </button>
      {!serverReady && (
        <p className="form-hint" style={{ marginTop: 10 }}>Connecting to the interview server…</p>
      )}
    </div>
  )
}
