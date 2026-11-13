import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { LayoutDashboard, FileText, Map, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Wordmark, Turn, Eclipse } from '../components/Marks'
import { Reveal, Stagger, StaggerItem } from '../components/Reveal'
import Circuit from '../components/Circuit'
import Backdrop from '../components/Backdrop'

const STEPS = [
  { title: 'Upload your resume', body: 'A PDF is enough. We read the skills you list so the questions match what you say you know.' },
  { title: 'Answer 30 multiple-choice questions', body: '15 on aptitude, then 15 on the role you pick. Jump between them and submit when you’re ready.' },
  { title: 'Talk through five follow-ups', body: 'Each one is written from where you struggled. Type your answer or say it out loud.' },
  { title: 'Get your report and study plan', body: 'Scores by phase and topic, what to fix, and a plan that starts with the basics you’re missing.' },
]

const PREVIEW_TOPICS = [
  { topic: 'Python', score: 82 },
  { topic: 'DBMS', score: 78 },
  { topic: 'Operating systems', score: 49, weak: true },
  { topic: 'Computer networks', score: 41, weak: true },
]

const ROLES = [
  'Software Engineer', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
  'Data Engineer', 'Data Scientist', 'ML Engineer', 'DevOps Engineer',
  'System Design Engineer', 'Cloud Engineer',
]

function AppPreview() {
  return (
    <div className="app-frame">
      <div className="app-top">
        <Wordmark />
        <span style={{ marginLeft: 12 }}>Report for Backend Developer</span>
        <span style={{ marginLeft: 'auto' }}>10 Nov 2026</span>
      </div>
      <div className="app-body">
        <nav className="app-side" aria-hidden="true">
          <span><LayoutDashboard size={16} strokeWidth={1.75} /> Dashboard</span>
          <span className="is-on"><FileText size={16} strokeWidth={1.75} /> Reports</span>
          <span><Map size={16} strokeWidth={1.75} /> Study plan</span>
          <span><Settings size={16} strokeWidth={1.75} /> Settings</span>
        </nav>
        <div className="app-main">
          <div className="app-card" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <span className="label">The interviewer’s verdict</span>
              <p style={{ color: 'var(--text)', fontSize: '1.35rem', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.25, maxWidth: '24ch' }}>
                You’re close. Networking and OS are holding you back.
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="verdict-num" style={{ fontSize: '3.6rem' }}>68</div>
              <div className="verdict-of">out of 100</div>
            </div>
          </div>
          <div className="app-card">
            <span className="label">Topics, weakest last</span>
            {PREVIEW_TOPICS.map(t => (
              <div key={t.topic} className={'bar-row' + (t.weak ? ' is-weak' : '')} style={{ gridTemplateColumns: 'minmax(90px, 1fr) 1.4fr 28px', fontSize: '0.9rem', padding: '6px 0' }}>
                <span>{t.topic}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${t.score}%` }} /></div>
                <span className="bar-value">{t.score}</span>
              </div>
            ))}
          </div>
          <div className="app-card">
            <span className="label">Next on your study plan</span>
            <ol style={{ paddingLeft: '1.2em', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text)', fontSize: '0.92rem' }}>
              <li>OSI and TCP/IP layers</li>
              <li>TCP congestion control</li>
              <li>Virtual memory and paging</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const startHref = user ? '/upload' : '/register'
  const startLabel = user ? 'Start a new interview' : 'Start practising'
  const reduce = useReducedMotion()

  // Whole-page progress bar
  const { scrollYProgress: pageProgress, scrollY } = useScroll()

  // Hero drifts up and fades as you scroll away; the circuit lags behind for depth
  const heroY        = useTransform(scrollY, [0, 600], [0, -110])
  const heroOpacity  = useTransform(scrollY, [0, 480], [1, 0])
  const circuitY     = useTransform(scrollY, [0, 600], [0, -40])
  const circuitScale = useTransform(scrollY, [0, 600], [1, 1.08])
  const flareY       = useTransform(scrollY, [0, 600], [0, 140])

  // Report preview tilts up and lights as it enters
  const stageRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ['start end', 'start 0.25'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0])
  const scale   = useTransform(scrollYProgress, [0, 1], [0.9, 1])
  const y       = useTransform(scrollYProgress, [0, 1], [60, 0])
  const light   = useTransform(scrollYProgress, [0, 1], [0.25, 1])
  const frameStyle = reduce ? undefined : { rotateX, scale, y }

  // Closing planet rises into view
  const closingRef = useRef(null)
  const { scrollYProgress: closingProgress } = useScroll({ target: closingRef, offset: ['start end', 'end end'] })
  const planetY = useTransform(closingProgress, [0, 1], [180, 0])

  const heroIntro = reduce ? {} : {
    initial: 'hidden', animate: 'show',
    variants: { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } },
  }
  const introItem = {
    hidden: { opacity: 0, y: 22, filter: 'blur(8px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  }

  return (
    <div>
      <Backdrop />
      <div className="page-layer">
      {!reduce && <motion.div className="scroll-progress" style={{ scaleX: pageProgress }} aria-hidden="true" />}

      {!user && (
        <header className="site-nav glass-bar">
          <div className="container site-nav-inner">
            <Wordmark />
            <nav className="site-links" aria-label="Sections">
              <a href="#how">How it works</a>
              <a href="#report">The report</a>
              <a href="#follow-ups">Follow-ups</a>
              <a href="#roles">Roles</a>
            </nav>
            <div className="site-actions">
              <Link to="/login" className="btn btn-ghost">Sign in</Link>
              <Link to="/register" className="btn btn-primary">Start free</Link>
            </div>
          </div>
        </header>
      )}

      <section className={'hero2' + (user ? ' under-appnav' : '')}>
        <motion.div className="hero2-flare" aria-hidden="true" style={reduce ? undefined : { y: flareY }} />

        <motion.div className="container hero2-content" style={reduce ? undefined : { y: heroY, opacity: heroOpacity }}>
          <motion.div {...heroIntro}>
            <motion.div variants={introItem} className="pill"><b>New</b> Follow-up questions that react to your answers</motion.div>
            <motion.h1 variants={introItem}>Interview practice that pushes back.</motion.h1>
            <motion.p variants={introItem} className="hero2-lede">
              Upload your resume and sit a technical interview built around it. Answer well
              and the questions get harder; struggle and they dig in. Then see exactly what to fix.
            </motion.p>
            <motion.div variants={introItem} className="hero-actions">
              <Link to={startHref} className="btn btn-primary btn-lg">{startLabel}</Link>
              <a href="#how" className="btn btn-secondary btn-lg">See how it works</a>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero2-circuit"
          style={reduce ? undefined : { y: circuitY, scale: circuitScale }}
          initial={reduce ? undefined : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
        >
          <Circuit />
        </motion.div>
      </section>

      <section id="how" className="section">
        <div className="container">
          <Reveal className="section-head">
            <h2>One sitting, start to finish</h2>
            <p className="section-lede">About 35 questions. Leave whenever you need to; your answers are saved.</p>
          </Reveal>
          <Stagger as="ol" className="steps" gap={0.12}>
            {STEPS.map((s, i) => (
              <StaggerItem as="li" key={s.title} className="step glass">
                <span className="step-num">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section id="report" className="showcase">
        <Reveal className="container section-head center">
          <h2>Then you get the report</h2>
          <p className="section-lede">A straight verdict, scores by topic, and a study plan that starts with the basics.</p>
        </Reveal>
        <Eclipse />
        <div className="stage" ref={stageRef} aria-label="Preview of an interview report">
          <motion.div className="stage-light" style={reduce ? undefined : { opacity: light }} aria-hidden="true" />
          <div className="container">
            <motion.div style={frameStyle}>
              <AppPreview />
            </motion.div>
          </div>
        </div>
      </section>

      <section id="follow-ups" className="section" style={{ paddingTop: 0 }}>
        <div className="container split">
          <Reveal>
            <h2>Follow-ups that react to what you said</h2>
            <p>
              The last five questions aren’t from a fixed list. Each one is written from
              your previous answer and from the topics you found hardest in the
              multiple-choice rounds.
            </p>
            <p>
              Get one right and the next goes deeper. Miss something and it comes back
              to it from another angle, the way a real interviewer would.
            </p>
          </Reveal>
          <Stagger className="panel glass" gap={0.5} delay={0.15} amount={0.4} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} aria-label="Example exchange">
            <StaggerItem style={{ display: 'flex', flexDirection: 'column' }}>
              <Turn who="them" level={2}>Your resume mentions PostgreSQL. Two transactions update the same row and one update is lost. What happened?</Turn>
            </StaggerItem>
            <StaggerItem style={{ display: 'flex', flexDirection: 'column' }}>
              <Turn who="you">Both read the old value before either wrote, so the second overwrote the first. I’d lock the row with SELECT … FOR UPDATE.</Turn>
            </StaggerItem>
            <StaggerItem style={{ display: 'flex', flexDirection: 'column' }}>
              <Turn who="them" level={3}>Good. Now say you can’t hold locks that long. What catches it instead?</Turn>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      <section id="roles" className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal className="section-head center">
            <h2>Built for the role you want</h2>
            <p className="section-lede">Role questions and follow-ups change with your pick. Not listed? Type your own.</p>
          </Reveal>
          <Stagger as="ul" className="role-list" gap={0.05}>
            {ROLES.map(r => <StaggerItem as="li" key={r} y={14} className="glass-pill">{r}</StaggerItem>)}
          </Stagger>
        </div>
      </section>

      <section className="closing" ref={closingRef}>
        <Reveal className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h2>Make your next interview a rehearsal.</h2>
          <p>Free. All you need is a PDF of your resume.</p>
          <Link to={startHref} className="btn btn-primary btn-lg">{startLabel}</Link>
        </Reveal>
        <motion.div className="closing-planet" style={reduce ? undefined : { y: planetY }}>
          <Eclipse />
        </motion.div>
      </section>

      <footer className="landing-footer">
        <div className="container landing-footer-inner">
          <Wordmark />
          <nav aria-label="Legal">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
          <span>© 2026 InterviewAI</span>
        </div>
      </footer>
      </div>
    </div>
  )
}
