import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1]

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({ as = 'div', delay = 0, y = 28, amount = 0.3, children, ...rest }) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  if (reduce) return <Tag {...rest}>{children}</Tag>
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** A list whose items reveal one after another. Use <StaggerItem> for each child. */
export function Stagger({ as = 'div', gap = 0.09, delay = 0, amount = 0.25, children, ...rest }) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  if (reduce) return <Tag {...rest}>{children}</Tag>
  return (
    <Tag
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function StaggerItem({ as = 'div', y = 24, children, ...rest }) {
  const Tag = motion[as]
  return (
    <Tag
      variants={{
        hidden: { opacity: 0, y, filter: 'blur(6px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
