import React from 'react'
import { Link } from 'react-router-dom'
import { Brain, Mic, Code, BarChart3, Map, ChevronRight, Zap, Shield, Award } from 'lucide-react'

const features = [
  { icon: Brain, title: 'AI-Powered Questions', desc: 'Adaptive questions generated from your resume and skill profile using Gemini AI' },
  { icon: Mic, title: 'Voice Analysis', desc: 'Prosodic feature analysis measures speaking pace, confidence indicators, and clarity' },
  { icon: Code, title: 'Live Code Execution', desc: 'Submit code during technical rounds — evaluated instantly via Judge0 API' },
  { icon: BarChart3, title: 'Multi-Dimensional Scoring', desc: 'Technical, coding, communication, and confidence scores in a transparent breakdown' },
  { icon: Map, title: 'Personalized Roadmap', desc: 'NetworkX-powered learning plan ordered by prerequisites and deficit severity' },
  { icon: Zap, title: 'Adaptive Difficulty', desc: 'Question difficulty adjusts in real-time based on your rolling performance score' },
]

const stats = [
  { value: '300+', label: 'Interview Questions' },
  { value: '11', label: 'Technical Domains' },
  { value: '7', label: 'Scoring Dimensions' },
  { value: '100%', label: 'AI-Personalized' },
]

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gradient-hero)' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Brain size={28} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: 20, fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>InterviewAI</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="btn btn-secondary">Login</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '100px 24px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div className="badge badge-primary" style={{ marginBottom: 24, fontSize: 13 }}>
          <Zap size={12} /> AI Powered Interviews
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, lineHeight: 1.15, marginBottom: 24 }}>
          Ace Your Next Interview with{' '}
          <span className="text-gradient">Adaptive AI</span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
          Upload your resume. Get personalized technical and HR interview questions.
          Receive multi-dimensional feedback. Build a targeted learning roadmap.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg">
            Start Free Interview <ChevronRight size={18} />
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 64, flexWrap: 'wrap' }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, marginBottom: 48 }}>
          Everything you need to <span className="text-gradient">prepare</span>
        </h2>
        <div className="grid-3">
          {features.map(f => (
            <div key={f.title} className="card" style={{ transition: 'transform 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <f.icon size={22} style={{ color: '#6366f1' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flow */}
      <section style={{ padding: '60px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 48 }}>How it <span className="text-gradient">works</span></h2>
        <div style={{ display: 'flex', gap: 0, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 900, margin: '0 auto' }}>
          {['Upload Resume', 'Start Interview', 'AI Evaluates', 'Get Roadmap'].map((step, i) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', padding: '0 20px' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, margin: '0 auto 12px' }}>{i + 1}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{step}</div>
              </div>
              {i < 3 && <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: 600, margin: '0 auto', padding: '48px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <Award size={40} style={{ color: '#6366f1', marginBottom: 20 }} />
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Ready to ace your interviews?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>Join thousands of candidates who have improved their interview performance with AI-powered personalized practice.</p>
          <Link to="/register" className="btn btn-primary btn-lg btn-full">
            Get Started — It's Free <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        <p>© 2025 InterviewAI · SJB Institute of Technology</p>
      </footer>
    </div>
  )
}
