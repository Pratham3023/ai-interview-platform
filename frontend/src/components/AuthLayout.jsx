import React from 'react'
import { Wordmark, Turn, Eclipse } from './Marks'

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Eclipse />
        <div style={{ position: 'relative', zIndex: 1 }}><Wordmark /></div>
        <div className="turns" aria-label="Example exchange">
          <Turn who="them" level={2}>Walk me through what happens when you type a URL and press Enter.</Turn>
          <Turn who="you">DNS lookup first, then a TCP handshake, then TLS, then the HTTP request…</Turn>
          <Turn who="them" level={3}>Good. Where would you expect the most latency on a cold start?</Turn>
        </div>
        <p style={{ fontSize: '0.95rem', maxWidth: '40ch', position: 'relative', zIndex: 1 }}>
          Follow-ups get harder when you answer well, and dig in where you don’t.
        </p>
      </aside>

      <main className="auth-main">
        <div className="auth-box">
          <div className="auth-mobile-brand"><Wordmark /></div>
          <div className="auth-heading">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="auth-card">{children}</div>
          {footer && <p className="auth-footer">{footer}</p>}
        </div>
      </main>
    </div>
  )
}
