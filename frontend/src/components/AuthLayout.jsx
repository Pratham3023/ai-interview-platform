import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Wordmark, Eclipse } from './Marks'
import Backdrop from './Backdrop'
import { LiveExchange } from './AuthBits'

const EASE = [0.16, 1, 0.3, 1]

const EXCHANGE = [
  { who: 'them', level: 2, text: 'Walk me through what happens when you type a URL and press Enter.' },
  { who: 'you', text: 'DNS lookup, then a TCP handshake, then TLS, then the HTTP request…' },
  { who: 'them', level: 3, text: 'Good. Where would you expect the most latency on a cold start?' },
]

export default function AuthLayout({ title, subtitle, children, footer, blurb }) {
  const reduce = useReducedMotion()
  const cardRef = useRef(null)

  const rise = (delay = 0, y = 20) => reduce ? {} : {
    initial: { opacity: 0, y, filter: 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.9, ease: EASE, delay },
  }

  // Light that follows the pointer across the glass
  const onMove = (e) => {
    const el = cardRef.current
    if (!el || reduce) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }

  return (
    <div className="auth3">
      <Backdrop />

      <motion.div
        className="auth3-planet"
        initial={reduce ? false : { y: 160, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.6, ease: EASE }}
      >
        <Eclipse />
      </motion.div>

      <motion.header className="container auth3-top" {...rise(0.1, -10)}>
        <Wordmark />
        <Link to="/" className="back">Back to home</Link>
      </motion.header>

      <main className="container auth3-main">
        <section className="auth3-side">
          <motion.div className="pill" {...rise(0.25)}><b>Live</b> Follow-ups that react to your answers</motion.div>
          <motion.h2 {...rise(0.35)}>Practise with an interviewer that listens.</motion.h2>
          <motion.p {...rise(0.45)}>
            {blurb || 'Sign in to pick up your last interview, or start a new one from your resume.'}
          </motion.p>
          <LiveExchange lines={EXCHANGE} start={1.1} gap={1.7} typing={1.0} />
        </section>

        <motion.div
          ref={cardRef}
          className="auth3-card glass"
          onMouseMove={onMove}
          initial={reduce ? false : { opacity: 0, y: 30, scale: 0.97, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: EASE, delay: 0.3 }}
        >
          <span className="auth3-spot" aria-hidden="true" />
          <span className="auth3-sheen" aria-hidden="true" />
          <div className="auth3-card-inner">
            <div className="auth-heading">
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <div className="auth-card">{children}</div>
            {footer && <p className="auth-footer">{footer}</p>}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
