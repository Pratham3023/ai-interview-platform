import React from 'react'
import { Link } from 'react-router-dom'

export function Wordmark({ to = '/', className = '' }) {
  return (
    <Link to={to} className={`wordmark ${className}`} aria-label="InterviewAI home">
      <span className="wordmark-mark" aria-hidden="true" />
      InterviewAI
    </Link>
  )
}

/** One line of a conversation. `who` is "them" (interviewer, serif) or "you" (candidate). */
export function Turn({ who = 'them', label, children, level }) {
  return (
    <div className={`turn is-${who}`}>
      <span className="turn-who">
        {label || (who === 'them' ? 'Interviewer' : 'You')}
        {level && <Level n={level} />}
      </span>
      <div className="bubble">{children}</div>
    </div>
  )
}

/** Three rising bars showing question difficulty (1 easy, 2 medium, 3 hard). */
export function Level({ n }) {
  const names = { 1: 'easy', 2: 'medium', 3: 'hard' }
  return (
    <span className={`level l${n}`} role="img" aria-label={`Difficulty: ${names[n]}`}>
      <i /><i /><i />
    </span>
  )
}

export const scoreTone = (s) => (s >= 75 ? 'var(--ok)' : s >= 55 ? '#8A5A12' : 'var(--err)')

/** The interviewer's closing remark for a score, in their voice. */
export const verdictLine = (s) =>
  s >= 85 ? 'That was a strong interview. I’d move you to the next round.'
  : s >= 70 ? 'Good interview. Tighten a couple of topics and you’re ready.'
  : s >= 55 ? 'You’re close. A few topics are holding you back.'
  : 'Not there yet, but now we know exactly what to work on.'

export const scoreWord = (s) => (s >= 85 ? 'Excellent' : s >= 70 ? 'Good' : s >= 55 ? 'Close' : 'Not there yet')

/** The orange-rimmed eclipse: the page's single light source. Decorative. */
export function Eclipse({ className = '' }) {
  return (
    <div className={`eclipse-wrap ${className}`} aria-hidden="true">
      <div className="eclipse-halo" />
      <div className="eclipse" />
    </div>
  )
}
