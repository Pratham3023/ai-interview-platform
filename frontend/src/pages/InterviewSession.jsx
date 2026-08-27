import React, { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Send, Code, ChevronRight, CheckCircle, Volume2 } from 'lucide-react'
import { interviewAPI, codingAPI, scoringAPI } from '../services/api'
import Editor from '@monaco-editor/react'
import toast from 'react-hot-toast'

const DIFFICULTY_COLOR = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' }
const TYPE_BADGE = { technical: { label: 'Technical', color: '#6366f1' }, coding: { label: 'Coding', color: '#06b6d4' }, behavioral: { label: 'Behavioral', color: '#a855f7' }, intro: { label: 'Introduction', color: '#10b981' } }

const LANGUAGE_IDS = [
  { id: 71, name: 'Python' }, { id: 62, name: 'Java' }, { id: 54, name: 'C++' },
  { id: 50, name: 'C' }, { id: 63, name: 'JavaScript' },
]

export default function InterviewSession() {
  const { sessionId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [currentQ, setCurrentQ] = useState(state?.firstQuestion || null)
  const [answer, setAnswer] = useState('')
  const [code, setCode] = useState('# Write your solution here\n')
  const [langId, setLangId] = useState(71)
  const [submitting, setSubmitting] = useState(false)
  const [thinkingMsg, setThinkingMsg] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [qNumber, setQNumber] = useState(1)
  const [totalQ] = useState(15)
  const [isListening, setIsListening] = useState(false)
  const [codeResult, setCodeResult] = useState(null)
  const [runningCode, setRunningCode] = useState(false)
  const recognitionRef = useRef(null)
  const answerRef = useRef(null)

  // Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SR()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join('')
        setAnswer(transcript)
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)
      recognitionRef.current = recognition
    }
    return () => recognitionRef.current?.stop()
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) return toast.error('Speech recognition not supported in this browser')
    if (isListening) { recognitionRef.current.stop(); setIsListening(false) }
    else { recognitionRef.current.start(); setIsListening(true); toast.success('Listening...') }
  }

  const speakQuestion = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = 0.9
      window.speechSynthesis.speak(utt)
    }
  }

  useEffect(() => {
    if (currentQ?.question) speakQuestion(currentQ.question)
  }, [currentQ])

  const handleRunCode = async () => {
    setRunningCode(true)
    setCodeResult(null)
    try {
      const result = await codingAPI.submit({
        session_id: sessionId,
        question_id: currentQ.id,
        code,
        language_id: langId,
        stdin: '',
      })
      setCodeResult(result)
      toast.success(`Code executed: ${result.status}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRunningCode(false)
    }
  }

  const handleSubmit = async () => {
    const finalAnswer = currentQ?.requires_code ? (codeResult?.stdout || code.slice(0, 200)) : answer
    if (!finalAnswer.trim() && !currentQ?.requires_code) return toast.error('Please provide an answer')

    setSubmitting(true)
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false) }

    // Cycle through messages so user knows it's working, not frozen
    const messages = [
      '📡 Sending your answer...',
      '🤖 AI is evaluating your response...',
      '🧠 Analyzing keywords & concepts...',
      '✨ Generating next question...',
    ]
    let msgIndex = 0
    setThinkingMsg(messages[0])
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length
      setThinkingMsg(messages[msgIndex])
    }, 4000)

    try {
      const resp = await interviewAPI.submitAnswer({
        session_id: sessionId,
        question_id: currentQ.id,
        answer_text: finalAnswer || answer || '[Code submitted]',
        is_follow_up: currentQ.is_follow_up || false,
        follow_up_of: currentQ.follow_up_of || null,
      })

      setEvaluation(resp.evaluation)

      if (resp.session_complete) {
        toast.success('Interview complete! Computing your scores...')
        await scoringAPI.compute(sessionId)
        setTimeout(() => navigate(`/results/${sessionId}`), 2000)
      } else if (resp.next_question) {
        setTimeout(() => {
          setCurrentQ(resp.next_question)
          setAnswer('')
          setCode('# Write your solution here\n')
          setCodeResult(null)
          setEvaluation(null)
          setQNumber(n => n + 1)
        }, 2500)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit answer')
    } finally {
      clearInterval(msgInterval)
      setThinkingMsg('')
      setSubmitting(false)
    }
  }

  if (!currentQ) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div className="spinner" style={{ width: 48, height: 48 }} />
    </div>
  )

  const isCoding = currentQ.type === 'coding'
  const tb = TYPE_BADGE[currentQ.type] || TYPE_BADGE.technical

  return (
    <div style={{ padding: '24px', maxWidth: isCoding ? 1200 : 800, margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span className="text-secondary">Question {qNumber} of {totalQ}</span>
          <span className="text-secondary">{Math.round((qNumber / totalQ) * 100)}%</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${(qNumber / totalQ) * 100}%` }} /></div>
      </div>

      <div style={isCoding ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' } : {}}>
        {/* Question */}
        <div className="card" style={{ marginBottom: isCoding ? 0 : 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge" style={{ background: `${tb.color}22`, color: tb.color }}>{tb.label}</span>
              <span className="badge" style={{ background: `${DIFFICULTY_COLOR[currentQ.difficulty]}22`, color: DIFFICULTY_COLOR[currentQ.difficulty] }}>{currentQ.difficulty}</span>
              {currentQ.topic && <span className="badge badge-primary">{currentQ.topic}</span>}
            </div>
            <button onClick={() => speakQuestion(currentQ.question)} className="btn btn-secondary btn-sm btn-icon" title="Read question aloud">
              <Volume2 size={14} />
            </button>
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.6, marginBottom: isCoding ? 0 : 24 }}>
            {currentQ.question}
          </h2>

          {/* Evaluation Feedback */}
          {evaluation && (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'Keywords', val: evaluation.keyword_score?.toFixed(1) + '/10' },
                  { label: 'Semantic', val: evaluation.semantic_score?.toFixed(1) + '/10' },
                  { label: 'Overall', val: evaluation.composite_score?.toFixed(1) + '/10' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {evaluation.feedback && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{evaluation.feedback}</p>}
              {evaluation.missed_keywords?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Missed: </span>
                  {evaluation.missed_keywords.map(k => <span key={k} style={{ fontSize: 12, color: '#fca5a5', marginRight: 6 }}>{k}</span>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Answer Area */}
        {isCoding ? (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Code Editor</h3>
              <select value={langId} onChange={e => setLangId(Number(e.target.value))} className="form-select" style={{ padding: '6px 10px', fontSize: 13 }}>
                {LANGUAGE_IDS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 16, border: '1px solid var(--color-border)' }}>
              <Editor height="300px" defaultLanguage="python" language={langId === 62 ? 'java' : langId === 63 ? 'javascript' : 'python'}
                value={code} onChange={v => setCode(v)} theme="vs-dark"
                options={{ fontSize: 14, minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false, fontFamily: 'JetBrains Mono, monospace' }} />
            </div>

            {codeResult && (
              <div style={{ padding: 12, borderRadius: 8, background: codeResult.status.includes('Accepted') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${codeResult.status.includes('Accepted') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, marginBottom: 16, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Status: {codeResult.status}</div>
                {codeResult.stdout && <div style={{ color: '#86efac', whiteSpace: 'pre-wrap' }}>{codeResult.stdout}</div>}
                {codeResult.stderr && <div style={{ color: '#fca5a5', whiteSpace: 'pre-wrap' }}>{codeResult.stderr}</div>}
                {codeResult.compile_output && <div style={{ color: '#fcd34d', whiteSpace: 'pre-wrap' }}>{codeResult.compile_output}</div>}
                <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>Score: {codeResult.coding_score}/10</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleRunCode} disabled={runningCode} className="btn btn-secondary" style={{ flex: 1 }}>
                {runningCode ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Code size={14} /> Run Code</>}
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> {thinkingMsg || 'Submitting...'}</> : <><CheckCircle size={14} /> Submit</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Your Answer</h3>
              <button onClick={toggleListening} className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                style={isListening ? { animation: 'pulse 1.5s ease infinite' } : {}}>
                {isListening ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Voice Input</>}
              </button>
            </div>
            <textarea ref={answerRef} value={answer} onChange={e => setAnswer(e.target.value)}
              className="form-input" placeholder="Type your answer here, or use voice input above..."
              style={{ width: '100%', minHeight: 180, resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.6 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span className="text-muted text-xs">{answer.split(/\s+/).filter(Boolean).length} words</span>
              <button onClick={handleSubmit} disabled={submitting || !answer.trim()} className="btn btn-primary">
                {submitting
                  ? <><span className="spinner" style={{ width: 18, height: 18 }} /> <span style={{ fontSize: 13 }}>{thinkingMsg || 'Submitting...'}</span></>
                  : <><Send size={16} /> Submit Answer</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
