import React from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Wordmark, Turn, Eclipse } from './Marks'
import Backdrop from './Backdrop'

const EASE = [0.16, 1, 0.3, 1]

export default function AuthLayout({ title, subtitle, children, footer }) {
  const reduce = useReducedMotion()
  const rise = (delay = 0) => reduce ? {} : {
    initial: { opacity: 0, y: 18, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.8, ease: EASE, delay },
  }

  return (
    <div className="auth2">
      <Backdrop />
      <Eclipse />

      <header className="container auth2-top">
        <Wordmark />
        <Link to="/" className="back">Back to home</Link>
      </header>

      <main className="container auth2-main">
        <section className="auth2-side" aria-label="What a session is like">
          <motion.h2 {...rise(0.05)}>Practise with an interviewer that listens.</motion.h2>
          <motion.p {...rise(0.15)}>
            Follow-ups get harder when you answer well, and dig in where you don’t.
          </motion.p>
          <div className="auth2-turns">
            <motion.div {...rise(0.35)} style={{ display: 'flex', flexDirection: 'column' }}>
              <Turn who="them" level={2}>Walk me through what happens when you type a URL and press Enter.</Turn>
            </motion.div>
            <motion.div {...rise(0.75)} style={{ display: 'flex', flexDirection: 'column' }}>
              <Turn who="you">DNS lookup, then a TCP handshake, then TLS, then the HTTP request…</Turn>
            </motion.div>
            <motion.div {...rise(1.15)} style={{ display: 'flex', flexDirection: 'column' }}>
              <Turn who="them" level={3}>Good. Where would you expect the most latency on a cold start?</Turn>
            </motion.div>
          </div>
        </section>

        <motion.div className="auth2-card glass" {...rise(0.1)}>
          <div className="auth-heading">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="auth-card">{children}</div>
          {footer && <p className="auth-footer">{footer}</p>}
        </motion.div>
      </main>
    </div>
  )
}
