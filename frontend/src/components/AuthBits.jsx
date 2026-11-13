import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { Level } from './Marks'

const EASE = [0.16, 1, 0.3, 1]

/**
 * A short interview exchange that plays out like a live chat:
 * each line shows a "typing" indicator first, then the message.
 */
export function LiveExchange({ lines, start = 0.6, gap = 1.5, typing = 0.9 }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? lines.length : 0)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (reduce) { setShown(lines.length); setIsTyping(false); return }
    setShown(0)
    const timers = []
    lines.forEach((_, i) => {
      const at = (start + i * gap) * 1000
      timers.push(setTimeout(() => setIsTyping(true), at))
      timers.push(setTimeout(() => { setIsTyping(false); setShown(i + 1) }, at + typing * 1000))
    })
    return () => timers.forEach(clearTimeout)
  }, [reduce, lines, start, gap, typing])

  const next = lines[shown]

  return (
    <div className="auth3-chat" aria-label="Example interview exchange">
      <AnimatePresence initial={false}>
        {lines.slice(0, shown).map((l, i) => (
          <motion.div
            key={i}
            className={`turn is-${l.who}`}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <span className="turn-who">
              {l.who === 'them' ? 'Interviewer' : 'You'}
              {l.level && <Level n={l.level} />}
            </span>
            <div className="bubble">{l.text}</div>
          </motion.div>
        ))}
        {isTyping && next && (
          <motion.div
            key="typing"
            className={`turn is-${next.who}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3 }}
            aria-hidden="true"
          >
            <div className="bubble typing"><i /><i /><i /></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Password input with a show/hide toggle. Passes other props through to <input>. */
export function PasswordInput({ id, ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="pw-field">
      <input id={id} type={visible ? 'text' : 'password'} className="form-input" {...props} />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-controls={id}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
      </button>
    </div>
  )
}
