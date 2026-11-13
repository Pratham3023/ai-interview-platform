import React from 'react'
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from 'framer-motion'

/*
 * One continuous background for a whole page: a few soft pools of warm light on
 * true black. They drift as you scroll, eased through a spring, so the page reads
 * as a single surface instead of separate bands. Fixed, behind everything, decorative.
 */
export default function Backdrop({ intensity = 1 }) {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const p = useSpring(scrollYProgress, { stiffness: 60, damping: 22, mass: 0.6 })

  // Orb A: starts top-right, sweeps down and left
  const aX = useTransform(p, [0, 1], ['55vw', '-10vw'])
  const aY = useTransform(p, [0, 1], ['-18vh', '55vh'])
  const aS = useTransform(p, [0, 0.5, 1], [1, 1.25, 0.95])
  // Orb B: rises from bottom-left to the right
  const bX = useTransform(p, [0, 1], ['-12vw', '52vw'])
  const bY = useTransform(p, [0, 1], ['70vh', '-5vh'])
  // Orb C: a low warm horizon that brightens toward the end of the page
  const cO = useTransform(p, [0, 0.6, 1], [0.35, 0.55, 0.9])
  // Overall warmth breathes a little through the page
  const warmth = useTransform(p, [0, 0.35, 0.7, 1], [0.9, 0.6, 0.75, 1])

  const s = (style) => (reduce ? undefined : style)

  return (
    <div className={'backdrop' + (reduce ? ' is-static' : '')} aria-hidden="true" style={{ '--intensity': intensity }}>
      <motion.div className="backdrop-layer" style={s({ opacity: warmth })}>
        <motion.span className="orb orb-a" style={s({ x: aX, y: aY, scale: aS })} />
        <motion.span className="orb orb-b" style={s({ x: bX, y: bY })} />
        <motion.span className="orb orb-c" style={s({ opacity: cO })} />
      </motion.div>
      <div className="backdrop-vignette" />
      <div className="backdrop-grain" />
    </div>
  )
}
