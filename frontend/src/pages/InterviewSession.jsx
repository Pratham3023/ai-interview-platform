import React, { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Mic, MicOff, Send, Code, CheckCircle, Volume2,
  ChevronRight, ChevronLeft, LayoutGrid, Brain, Terminal, Briefcase, Cpu
} from 'lucide-react'
import { interviewAPI, codingAPI, scoringAPI } from '../services/api'
import Editor from '@monaco-editor/react'
import toast from 'react-hot-toast'
import AudioWaveform from '../components/AudioWaveform'

// ── Constants ──────────────────────────────────────────────────────────────────

// Feature toggle: Coding evaluation temporarily paused for improvements (code preserved)
const ENABLE_CODING_PHASE = false

const DIFFICULTY_COLOR = { easy: 'var(--success)', medium: 'var(--warning)', hard: 'var(--danger)' }
const TYPE_BADGE = {
  aptitude_mcq: { label: 'Aptitude',       color: 'var(--brand-orange)', icon: Brain },
  role_mcq:     { label: 'Role Knowledge', color: 'var(--brand-amber)',  icon: Briefcase },
  technical:    { label: 'Technical',      color: 'var(--brand-jade)',   icon: Cpu },
  coding:       { label: 'Coding',         color: 'var(--success)',      icon: Code },
}
const PHASE_META = {
  aptitude_mcq: { label: 'Aptitude' },
  role_mcq:     { label: 'Role questions' },
  coding:       { label: 'Coding' },
  adaptive:     { label: 'Follow-ups' },
}

const LANGUAGE_IDS = [
  { id: 71, name: 'Python',     lang: 'python'     },
  { id: 62, name: 'Java',       lang: 'java'       },
  { id: 54, name: 'C++',        lang: 'cpp'        },
  { id: 50, name: 'C',          lang: 'c'          },
  { id: 63, name: 'JavaScript', lang: 'javascript' },
]

function getLangName(langId) {
  return LANGUAGE_IDS.find(l => l.id === langId)?.lang || 'python'
}

// ── Memoized Editor ────────────────────────────────────────────────────────────
const MemoizedEditor = memo(({ code, langId, onChange }) => (
  <div style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 16, border: '1px solid var(--rule)' }}>
    <Editor height="320px" defaultLanguage="python"
      language={getLangName(langId)}
      value={code} onChange={onChange} theme="vs-dark"
      options={{ fontSize: 14, minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, fontFamily: 'var(--font-mono)' }} />
  </div>
))

// ── Main Component ─────────────────────────────────────────────────────────────

export default function InterviewSession() {
  const { sessionId } = useParams()
  const { state: routeState } = useLocation()
  const navigate = useNavigate()

  // All navigable questions from backend (Phase 1 + 2 + Coding)
  const [navigableQuestions, setNavigableQuestions] = useState(
    routeState?.allNavigableQuestions || []
  )
  const [currentQ, setCurrentQ]           = useState(routeState?.firstQuestion || null)
  const [sessionPhase, setSessionPhase]   = useState('aptitude_mcq')
  const [paletteOpen, setPaletteOpen]     = useState(true)

  // Local answer state keyed by question_id
  const [localAnswers, setLocalAnswers]   = useState({})

  // Current question inputs
  const [selectedOption, setSelectedOption] = useState('')
  const [answer, setAnswer]               = useState('')
  const [code, setCode]                   = useState(routeState?.firstQuestion?.starter_code || '# Write your solution here\n')
  const [langId, setLangId]               = useState(71)
  const [codeResult, setCodeResult]       = useState(null)

  // Adaptive
  const [adaptiveQ, setAdaptiveQ]         = useState(null)
  const [adaptiveIdx, setAdaptiveIdx]     = useState(0)

  // UI
  const [activeTestCase, setActiveTestCase] = useState(0)
  const [submitting, setSubmitting]       = useState(false)
  const [runningCode, setRunningCode]     = useState(false)
  const [thinkingMsg, setThinkingMsg]     = useState('')
  const [isListening, setIsListening]     = useState(false)
  const recognitionRef = useRef(null)

  // ── Block Browser Back Button ────────────────────────────────────────────────
  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.pathname)
      toast.error("Back navigation is disabled during the interview.")
    }
    window.history.pushState(null, '', window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // ── Session Recovery on Refresh or Direct Navigation ───────────────────────
  useEffect(() => {
    if ((!navigableQuestions || navigableQuestions.length === 0) && sessionId) {
      interviewAPI.getSession(sessionId)
        .then(data => {
          if (data?.all_navigable_questions && data.all_navigable_questions.length > 0) {
            setNavigableQuestions(data.all_navigable_questions)
            if (!currentQ) {
              setCurrentQ(data.first_question || data.all_navigable_questions[0])
            }
          } else if (data?.current_question && !currentQ) {
            setCurrentQ(data.current_question)
          }
        })
        .catch(err => {
          console.error('Failed to restore session:', err)
        })
    }
  }, [sessionId, navigableQuestions, currentQ])

  // ── Speech Recognition ───────────────────────────────────────────────────────

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      const r = new SR()
      r.continuous = true
      r.interimResults = true
      r.onresult = (e) => {
        const t = Array.from(e.results).map(x => x[0].transcript).join('')
        setAnswer(t)
      }
      r.onerror = () => setIsListening(false)
      r.onend   = () => setIsListening(false)
      recognitionRef.current = r
    }
    return () => recognitionRef.current?.stop()
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) return toast.error('Speech not supported')
    if (isListening) { recognitionRef.current.stop(); setIsListening(false) }
    else             { recognitionRef.current.start(); setIsListening(true); toast.success('Listening...') }
  }

  const speakQuestion = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 0.9
      window.speechSynthesis.speak(u)
    }
  }

  useEffect(() => {
    if (currentQ?.question && sessionPhase === 'adaptive') speakQuestion(currentQ.question)
  }, [currentQ?.id, sessionPhase])

  // ── Save current answer to local map ─────────────────────────────────────────

  const saveCurrentAnswerLocally = useCallback(() => {
    if (!currentQ) return
    setLocalAnswers(prev => ({
      ...prev,
      [currentQ.id]: { selectedOption, answer, code, langId, codeResult }
    }))
  }, [currentQ, selectedOption, answer, code, langId, codeResult])

  // ── Navigate to a question ────────────────────────────────────────────────────

  const navigateToQuestion = useCallback((q) => {
    saveCurrentAnswerLocally()
    const saved = localAnswers[q.id]
    setSelectedOption(saved?.selectedOption || '')
    setAnswer(saved?.answer || '')
    setCode(saved?.code || q.starter_code || '# Write your solution here\n')
    setLangId(saved?.langId || 71)
    setCodeResult(saved?.codeResult || null)
    setActiveTestCase(0)
    setCurrentQ(q)
  }, [saveCurrentAnswerLocally, localAnswers])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCodeChange = useCallback((v) => {
    setCode(v || '')
  }, [])

  const handleRunCode = async () => {
    setRunningCode(true)
    setCodeResult(null)
    try {
      const result = await codingAPI.submit({
        session_id: sessionId, question_id: currentQ.id,
        code, language_id: langId, stdin: '',
      })
      setCodeResult(result)
      setLocalAnswers(prev => ({
        ...prev,
        [currentQ.id]: { ...(prev[currentQ.id] || {}), code, langId, codeResult: result }
      }))
      toast.success(`Code executed: ${result.status}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRunningCode(false)
    }
  }

  // ── Batch submit ──────────────────────────────────────────────────────────────

  const handleBatchSubmit = async (phase) => {
    saveCurrentAnswerLocally()

    const getPhaseAnswers = (p) => {
      const phaseQs = navigableQuestions.filter(q => q.phase === p)
      return phaseQs.map(q => {
        const saved = q.id === currentQ?.id
          ? { selectedOption, answer, code, langId, codeResult }
          : (localAnswers[q.id] || {})

        if (p === 'coding') {
          return { question_id: q.id, answer_text: saved.code || '', language: getLangName(saved.langId || 71) }
        }
        return { question_id: q.id, answer_text: '', selected_option: saved.selectedOption ? saved.selectedOption[0] : null }
      })
    }

    setSubmitting(true)
    const msgs = ['Submitting answers...', 'Evaluating...', 'Loading next phase...']
    let mi = 0
    setThinkingMsg(msgs[0])
    const iv = setInterval(() => { mi = (mi + 1) % msgs.length; setThinkingMsg(msgs[mi]) }, 2000)

    try {
      let resp;
      if (phase === 'all_mcqs') {
        await interviewAPI.submitBatchAnswers({ session_id: sessionId, phase: 'aptitude_mcq', answers: getPhaseAnswers('aptitude_mcq') })
        resp = await interviewAPI.submitBatchAnswers({ session_id: sessionId, phase: 'role_mcq', answers: getPhaseAnswers('role_mcq') })
      } else {
        resp = await interviewAPI.submitBatchAnswers({ session_id: sessionId, phase, answers: getPhaseAnswers(phase) })
      }
      clearInterval(iv)

      if (resp.session_complete) {
        toast.success('Interview complete! Computing scores...')
        scoringAPI.compute(sessionId).catch(e => console.warn('Pre-compute notice:', e))
        navigate(`/results/${sessionId}`)
        return
      }

      const np = resp.next_phase
      if (np === 'adaptive') {
        setSessionPhase('adaptive')
        setPaletteOpen(false)
        if (resp.first_adaptive_question) {
          setAdaptiveQ(resp.first_adaptive_question)
          setAdaptiveIdx(0)
          setCurrentQ(resp.first_adaptive_question)
          setAnswer('')
          setSelectedOption('')
        }
        toast.success('MCQs submitted! Now: Technical Deep-Dive')
      } else if (np === 'coding' && ENABLE_CODING_PHASE) {
        setSessionPhase('coding')
        setPaletteOpen(true)
        const firstCQ = navigableQuestions.find(q => q.phase === 'coding')
        if (firstCQ) { setCurrentQ(firstCQ); setCode(firstCQ.starter_code || '# Write your solution here\n'); setCodeResult(null); setLangId(71) }
        toast.success('Adaptive done! Now: Coding Challenge')
      } else {
        toast.success(resp.message || 'Phase submitted!')
      }
    } catch (err) {
      clearInterval(iv)
      if (err.message && err.message.toLowerCase().includes('already completed')) {
        toast.success('Interview completed! Loading results...')
        navigate(`/results/${sessionId}`)
        return
      }
      toast.error(err.message || 'Failed to submit')
    } finally {
      setThinkingMsg('')
      setSubmitting(false)
    }
  }

  // ── Adaptive single submit ────────────────────────────────────────────────────

  const handleAdaptiveSubmit = async () => {
    if (!answer.trim()) return toast.error('Please provide an answer')
    setSubmitting(true)
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false) }

    const msgs = ['Submitting...', 'Evaluating...', 'Next question...']
    let mi = 0
    setThinkingMsg(msgs[0])
    const iv = setInterval(() => { mi = (mi + 1) % msgs.length; setThinkingMsg(msgs[mi]) }, 2000)

    try {
      const resp = await interviewAPI.submitAnswer({
        session_id: sessionId, question_id: adaptiveQ.id,
        answer_text: answer, selected_option: null, language: 'python',
      })
      clearInterval(iv)

      if (resp.session_complete) {
        toast.success('Interview complete! Computing scores...')
        scoringAPI.compute(sessionId).catch(e => console.warn('Pre-compute notice:', e))
        navigate(`/results/${sessionId}`)
        return
      }

      if (resp.next_question) {
        const nq = resp.next_question
        if (nq.phase === 'coding' && ENABLE_CODING_PHASE) {
          setSessionPhase('coding')
          setPaletteOpen(true)
          const firstCQ = navigableQuestions.find(q => q.phase === 'coding')
          if (firstCQ) { setCurrentQ(firstCQ); setCode(firstCQ.starter_code || '# Write your solution here\n'); setCodeResult(null); setLangId(71) }
          toast.success('Deep-Dive done! Now: Coding Challenge')
        } else if (nq.phase !== 'coding') {
          setAdaptiveQ(nq)
          setAdaptiveIdx(p => p + 1)
          setCurrentQ(nq)
          setAnswer('')
          if (resp.message) toast.success(resp.message)
        } else {
          // Coding paused: complete interview session
          toast.success('Interview complete! Computing scores...')
          scoringAPI.compute(sessionId).catch(e => console.warn('Pre-compute notice:', e))
          navigate(`/results/${sessionId}`)
          return
        }
      }
    } catch (err) {
      clearInterval(iv)
      if (err.message && err.message.toLowerCase().includes('already completed')) {
        toast.success('Interview completed! Loading results...')
        navigate(`/results/${sessionId}`)
        return
      }
      toast.error(err.message || 'Failed to submit')
    } finally {
      setThinkingMsg('')
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!currentQ) return (
    <div className="page-wrapper-md" aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 80 }}>
      <div className="skeleton" style={{ width: '40%', height: 22 }} />
      <div className="skeleton" style={{ width: '90%', height: 30 }} />
      {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}
    </div>
  )

  const isAdaptive = sessionPhase === 'adaptive'
  const isCoding   = currentQ?.type === 'coding'
  const isMcq      = currentQ?.type === 'aptitude_mcq' || currentQ?.type === 'role_mcq'
  const tb         = TYPE_BADGE[currentQ.type] || TYPE_BADGE.technical
  const TbIcon     = tb.icon

  // Compute answered set
  const answeredIds = new Set(Object.entries(localAnswers)
    .filter(([, a]) => a?.selectedOption || a?.answer || (a?.code && a.code !== '# Write your solution here\n'))
    .map(([id]) => id)
  )
  if (currentQ && (selectedOption || answer || (code && code !== '# Write your solution here\n'))) {
    answeredIds.add(currentQ.id)
  }

  const totalNavigable   = navigableQuestions.length
  const adaptiveAnswered = Math.min(adaptiveIdx, 5)
  const overallAnswered  = answeredIds.size + adaptiveAnswered
  const progressPercent  = Math.round((overallAnswered / (totalNavigable + 5)) * 100)

  const paletteGroups = [
    { phase: 'aptitude_mcq', questions: navigableQuestions.filter(q => q.phase === 'aptitude_mcq') },
    { phase: 'role_mcq',     questions: navigableQuestions.filter(q => q.phase === 'role_mcq') },
    ...(ENABLE_CODING_PHASE ? [{ phase: 'coding', questions: navigableQuestions.filter(q => q.phase === 'coding') }] : []),
  ].filter(g => g.questions.length > 0)

  const unansweredMcqs = navigableQuestions.filter(
    q => (q.phase === 'aptitude_mcq' || q.phase === 'role_mcq') && !answeredIds.has(q.id)
  ).length

  const difficultyBadge = (d) =>
    d === 'easy' ? 'badge-success' : d === 'hard' ? 'badge-error' : 'badge-warning'
  const difficultyLabel = (d) => (d ? d.charAt(0).toUpperCase() + d.slice(1) : '')

  const confirmExit = () => {
    if (window.confirm('Leave the interview? Your answers so far are saved and you can come back to it.')) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="session">

      {/* ── Question navigator ─────────────────────────────── */}
      {!isAdaptive && (
        <aside
          className="session-aside"
          style={{ width: paletteOpen ? 280 : 0, minWidth: paletteOpen ? 280 : 0 }}
          aria-label="Question navigator"
          aria-hidden={!paletteOpen}
        >
          {paletteOpen && (
            <>
              <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid var(--rule)' }}>
                <div className="flex-between" style={{ marginBottom: 10 }}>
                  <span style={{ fontWeight: 650 }}>Questions</span>
                  <button
                    onClick={() => setPaletteOpen(false)}
                    className="navbar-logout"
                    aria-label="Hide question list"
                    title="Hide question list"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
                <div className="text-secondary tabular" style={{ fontSize: '0.92rem', marginBottom: 8 }}>
                  {answeredIds.size} of {totalNavigable} answered
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${totalNavigable ? Math.round((answeredIds.size / totalNavigable) * 100) : 0}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
                {paletteGroups.map(({ phase, questions }) => {
                  const pm = PHASE_META[phase]
                  const phaseAnswered = questions.filter(q => answeredIds.has(q.id)).length
                  return (
                    <div key={phase} style={{ marginBottom: 24 }}>
                      <div className="flex-between" style={{ marginBottom: 10, fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 600 }}>{pm.label}</span>
                        <span className="text-muted tabular">{phaseAnswered}/{questions.length}</span>
                      </div>
                      <div className="qgrid">
                        {questions.map((q, idx) => {
                          const isAnswered = answeredIds.has(q.id)
                          const isCurrent  = currentQ?.id === q.id
                          return (
                            <button
                              key={q.id}
                              onClick={() => navigateToQuestion(q)}
                              title={`Question ${idx + 1}: ${q.topic} (${q.difficulty})${isAnswered ? ', answered' : ''}`}
                              aria-label={`Question ${idx + 1}${isAnswered ? ', answered' : ''}`}
                              aria-current={isCurrent ? 'true' : undefined}
                              className={'qcell' + (isAnswered ? ' is-answered' : '') + (isCurrent ? ' is-current' : '')}
                            >
                              {idx + 1}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--rule)', padding: 16 }}>
                {sessionPhase !== 'coding' ? (
                  <button onClick={() => handleBatchSubmit('all_mcqs')} disabled={submitting} className="btn btn-primary btn-full">
                    {submitting ? <><span className="spinner" /> {thinkingMsg || 'Submitting…'}</> : 'Submit answers'}
                  </button>
                ) : (
                  <button onClick={() => handleBatchSubmit('coding')} disabled={submitting} className="btn btn-primary btn-full">
                    {submitting ? <><span className="spinner" /> {thinkingMsg || 'Submitting…'}</> : 'Submit code and finish'}
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
      )}

      {/* ── Main column ────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto' }}>
        <header className="session-bar">
          {!isAdaptive && !paletteOpen && (
            <button onClick={() => setPaletteOpen(true)} className="btn btn-secondary btn-sm">
              <LayoutGrid size={15} /> Questions
            </button>
          )}
          <span style={{ fontWeight: 650 }}>
            {isAdaptive ? `Follow-up ${adaptiveIdx + 1} of 5` : PHASE_META[currentQ.type]?.label || 'Interview'}
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="text-secondary tabular" style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
              {progressPercent}% done
            </span>
            <div className="progress-bar session-progress" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progressPercent}%`, transition: 'width 0.3s ease' }} />
            </div>
            <button onClick={confirmExit} className="btn btn-ghost btn-sm" title="Save and leave">
              Save and leave
            </button>
          </div>
        </header>

        <div style={{ maxWidth: isCoding ? 1280 : 860, margin: '0 auto', padding: '32px 32px 64px' }}>
          <div style={isCoding ? { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' } : undefined}>

            {isCoding ? (
              <>
                <div className="sheet">
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span className="badge badge-neutral"><TbIcon size={12} /> {tb.label}</span>
                    <span className={`badge ${difficultyBadge(currentQ.difficulty)}`}>{difficultyLabel(currentQ.difficulty)}</span>
                    {currentQ.topic && <span className="badge badge-neutral">{currentQ.topic}</span>}
                  </div>

                  <div className="speaker"><span className="speaker-dot" aria-hidden="true" />Interviewer</div>
                    <h2 className="question-text">{currentQ.question}</h2>

                  {currentQ.test_cases && currentQ.test_cases.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '0.95rem', marginBottom: 10 }}>Test cases</h3>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        {currentQ.test_cases.map((_, idx) => (
                          <button key={idx} onClick={() => setActiveTestCase(idx)}
                            className={`btn btn-sm ${activeTestCase === idx ? 'btn-primary' : 'btn-secondary'}`}>
                            Case {idx + 1}
                          </button>
                        ))}
                      </div>
                      {currentQ.test_cases[activeTestCase] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                          <div>
                            <div className="label" style={{ marginBottom: 4 }}>Input</div>
                            <pre className="code-block">
                              {currentQ.test_cases[activeTestCase].input_args ? JSON.stringify(currentQ.test_cases[activeTestCase].input_args) : currentQ.test_cases[activeTestCase].input}
                            </pre>
                          </div>
                          <div>
                            <div className="label" style={{ marginBottom: 4 }}>Expected output</div>
                            <pre className="code-block">
                              {typeof currentQ.test_cases[activeTestCase].expected_output === 'object' ? JSON.stringify(currentQ.test_cases[activeTestCase].expected_output) : currentQ.test_cases[activeTestCase].expected_output}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="sheet">
                  <div className="flex-between" style={{ marginBottom: 14 }}>
                    <h3 style={{ fontSize: '1rem' }}>Your solution</h3>
                    <label className="visually-hidden" htmlFor="lang-select">Language</label>
                    <select id="lang-select" value={langId} onChange={e => setLangId(Number(e.target.value))}
                      className="form-select" style={{ width: 'auto', minWidth: 130, padding: '6px 10px', fontSize: 14 }}>
                      {LANGUAGE_IDS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>

                  <MemoizedEditor code={code} langId={langId} onChange={handleCodeChange} />

                  {codeResult && (
                    <div className={`callout ${codeResult.status?.includes('Accepted') ? 'callout-success' : 'callout-error'}`}
                      style={{ marginBottom: 14, fontFamily: 'var(--font-mono)', fontSize: 13, flexDirection: 'column' }}>
                      <strong style={{ color: 'inherit' }}>{codeResult.status}</strong>
                      {codeResult.stdout && <div style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{codeResult.stdout}</div>}
                      {codeResult.stderr && <div style={{ whiteSpace: 'pre-wrap' }}>{codeResult.stderr}</div>}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleRunCode} disabled={runningCode} className="btn btn-secondary" style={{ flex: 1 }}>
                      {runningCode ? <><span className="spinner" /> Running…</> : <><Code size={15} /> Run code</>}
                    </button>
                    <button onClick={() => handleBatchSubmit('coding')} disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                      {submitting ? <><span className="spinner" /> Submitting…</> : 'Submit code'}
                    </button>
                  </div>
                </div>
              </>

            ) : isMcq ? (
              (() => {
                const allNavMcqs = navigableQuestions.filter(q => q.phase === 'aptitude_mcq' || q.phase === 'role_mcq')
                const ci = allNavMcqs.findIndex(q => q.id === currentQ.id)
                const prevQ = ci > 0 ? allNavMcqs[ci - 1] : null
                const nextQ = ci < allNavMcqs.length - 1 ? allNavMcqs[ci + 1] : null

                return (
                  <div className="sheet" style={{ padding: '32px 36px' }}>
                    <div className="flex-between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                      <span className="text-secondary tabular">
                        Question <strong>{ci + 1}</strong> of {allNavMcqs.length}
                      </span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {currentQ.topic && <span className="badge badge-neutral">{currentQ.topic}</span>}
                        <span className={`badge ${difficultyBadge(currentQ.difficulty)}`}>{difficultyLabel(currentQ.difficulty)}</span>
                      </div>
                    </div>

                    <div className="speaker"><span className="speaker-dot" aria-hidden="true" />Interviewer</div>
                    <h2 className="question-text">{currentQ.question}</h2>

                    <div role="group" aria-label="Answer options" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                      {currentQ.options?.map((opt, oi) => (
                        <button
                          key={opt}
                          type="button"
                          className="choice"
                          aria-pressed={selectedOption === opt}
                          onClick={() => setSelectedOption(opt)}
                          
                        >
                          <span className="option-key" aria-hidden="true">{String.fromCharCode(65 + oi)}</span>
                          <span style={{ lineHeight: 1.45, flex: 1 }}>{opt}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex-between" style={{ paddingTop: 20, borderTop: '1px solid var(--rule)', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => prevQ && navigateToQuestion(prevQ)} disabled={!prevQ} className="btn btn-secondary">
                          <ChevronLeft size={16} /> Previous
                        </button>
                        <button onClick={() => nextQ && navigateToQuestion(nextQ)} disabled={!nextQ} className="btn btn-secondary">
                          Next <ChevronRight size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        {unansweredMcqs > 0 && (
                          <span className="text-secondary" style={{ fontSize: '0.9rem' }}>{unansweredMcqs} left unanswered</span>
                        )}
                        <button onClick={() => handleBatchSubmit('all_mcqs')} disabled={submitting} className="btn btn-primary">
                          {submitting ? <><span className="spinner" /> {thinkingMsg || 'Submitting…'}</> : 'Submit answers'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()

            ) : (
              <div className="sheet" style={{ padding: '32px 36px' }}>
                <div className="flex-between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {currentQ.topic && <span className="badge badge-neutral">{currentQ.topic}</span>}
                    <span className={`badge ${difficultyBadge(currentQ.difficulty)}`}>{difficultyLabel(currentQ.difficulty)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => speakQuestion(currentQ.question)} className="btn btn-secondary btn-sm" title="Read the question aloud">
                      <Volume2 size={15} /> Read aloud
                    </button>
                    <button onClick={toggleListening} className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-secondary'}`}>
                      {isListening ? <><MicOff size={15} /> Stop dictation</> : <><Mic size={15} /> Dictate answer</>}
                    </button>
                  </div>
                </div>

                <div className="speaker"><span className="speaker-dot" aria-hidden="true" />Interviewer</div>
                    <h2 className="question-text">{currentQ.question}</h2>

                {isListening && (
                  <div className="callout callout-error" style={{ marginBottom: 14, alignItems: 'center', borderLeftWidth: 3 }}>
                    <span className="rec-dot" aria-hidden="true" />
                    <span style={{ color: 'var(--ink)', whiteSpace: 'nowrap' }}>Listening</span>
                    <div style={{ flex: 1, maxWidth: 320 }}>
                      <AudioWaveform isActive={isListening} height={26} barCount={28} />
                    </div>
                  </div>
                )}

                <label htmlFor="adaptive-answer" className="speaker" style={{ marginTop: 8 }}><span className="speaker-dot" aria-hidden="true" style={{ background: 'var(--orange)' }} />Your answer</label>
                <textarea
                  id="adaptive-answer"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  className="form-input answer-box"
                  placeholder="Type here, or use Dictate answer to speak."
                />

                <div className="flex-between" style={{ marginTop: 18, flexWrap: 'wrap', gap: 12 }}>
                  <span className="text-muted tabular" style={{ fontSize: '0.9rem' }}>
                    {answer.split(/\s+/).filter(Boolean).length} words
                  </span>
                  <button onClick={handleAdaptiveSubmit} disabled={submitting || !answer.trim()} className="btn btn-primary">
                    {submitting
                      ? <><span className="spinner" /> {thinkingMsg || 'Marking…'}</>
                      : <><Send size={15} /> Submit answer</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
