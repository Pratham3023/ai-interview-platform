import React, { useLayoutEffect, useRef, useState } from 'react'

/*
 * Decorative circuit: subject tiles on both sides feed traces into a central
 * "interviewer" chip, with light pulses travelling toward it.
 *
 * The drawing is 300 units tall and as wide as the space it sits in, so on a
 * wide screen the tiles move out toward the edges (longer traces) instead of
 * the whole thing shrinking into the middle. Nothing is stretched.
 */

const H = 300
const CY = 150
const CHIP = 104
const MIN_W = 1200

// dx = distance of the tile centre from its own edge of the drawing
const LEFT = [
  { label: 'DBMS', dx: 170, y: 44 },
  { label: 'DSA',  dx: 80,  y: 150 },
  { label: 'OS',   dx: 190, y: 256 },
]
const RIGHT = [
  { label: 'Networks',      dx: 190, y: 44 },
  { label: 'Python',        dx: 90,  y: 150 },
  { label: 'System design', dx: 210, y: 256 },
]

function nodeWidth(label) {
  return Math.max(84, label.length * 12.5 + 44)
}

function layout(W) {
  const cx = W / 2
  // on wide drawings, pull the tiles in a little from the very edge
  const inset = Math.max(0, (W - MIN_W) * 0.04)
  const nodes = [
    ...LEFT.map(n => ({ ...n, side: 'L', x: n.dx + inset })),
    ...RIGHT.map(n => ({ ...n, side: 'R', x: W - n.dx - inset })),
  ]
  const trace = (n, i) => {
    const dir = n.side === 'L' ? 1 : -1
    const pinX = cx - dir * (CHIP / 2)
    const pinY = CY - 30 + (i % 3) * 30
    const startX = n.x + dir * (nodeWidth(n.label) / 2)
    const bendX = pinX - dir * (80 + (i % 3) * 30)
    const dy = pinY - n.y
    const runX = bendX - dir * Math.abs(dy)
    return `M ${startX} ${n.y} H ${runX} L ${bendX} ${pinY} H ${pinX}`
  }
  const legs = [-36, -12, 12, 36].map(d => `M ${cx + d} ${CY + CHIP / 2} V ${H}`)
  return { cx, nodes, trace, legs }
}

export default function Circuit() {
  const ref = useRef(null)
  const [W, setW] = useState(MIN_W)

  useLayoutEffect(() => {
    const svg = ref.current
    if (!svg) return
    // Measure the svg's own box (it fills the space the hero leaves) and widen
    // the drawing to match that box's shape.
    const measure = () => {
      const { width, height } = svg.getBoundingClientRect()
      if (!width || !height) return
      const next = Math.round(Math.max(MIN_W, Math.min(H * (width / height), 3200)))
      setW(prev => (Math.abs(prev - next) > 8 ? next : prev))
    }
    measure()
    window.addEventListener('resize', measure)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(svg.parentElement)
    return () => { window.removeEventListener('resize', measure); ro?.disconnect() }
  }, [])

  const { cx, nodes, trace, legs } = layout(W)

  return (
    <svg ref={ref} className="circuit-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="chipEdge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4F4F6" />
          <stop offset="0.5" stopColor="#2A2A30" />
          <stop offset="1" stopColor="#D4D4DA" />
        </linearGradient>
        <radialGradient id="chipGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#D4D4DA" stopOpacity="0.4" />
          <stop offset="1" stopColor="#D4D4DA" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="legFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ECECF1" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ECECF1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* base traces */}
      <g fill="none" stroke="#33333B" strokeWidth="1.5">
        {nodes.map((n, i) => <path key={n.label} d={trace(n, i)} />)}
        {legs.map(d => <path key={d} d={d} />)}
      </g>

      {/* travelling pulses */}
      <g fill="none" stroke="#ECECF1" strokeWidth="2" strokeLinecap="round" className="pulses">
        {nodes.map((n, i) => (
          <path key={n.label} d={trace(n, i)} pathLength="100" style={{ animationDelay: `${i * 0.55}s` }} />
        ))}
      </g>
      <g fill="none" stroke="url(#legFade)" strokeWidth="1.5">
        {legs.map(d => <path key={d} d={d} />)}
      </g>

      {/* subject tiles */}
      {nodes.map(n => {
        const w = nodeWidth(n.label)
        return (
          <g key={n.label} transform={`translate(${n.x - w / 2} ${n.y - 28})`}>
            <rect width={w} height="56" rx="14" fill="#0B0B0D" stroke="#2E2E36" />
            <text x={w / 2} y="35" textAnchor="middle" fill="#E4E4E7" fontSize="21" fontFamily="Geist, system-ui, sans-serif" fontWeight="500">
              {n.label}
            </text>
          </g>
        )
      })}

      {/* chip */}
      <circle cx={cx} cy={CY} r="130" fill="url(#chipGlow)" />
      <rect x={cx - CHIP / 2} y={CY - CHIP / 2} width={CHIP} height={CHIP} rx="26" fill="#0B0B0D" stroke="url(#chipEdge)" strokeWidth="1.5" />
      <rect x={cx - CHIP / 2 + 10} y={CY - CHIP / 2 + 10} width={CHIP - 20} height={CHIP - 20} rx="18" fill="#050506" stroke="#24262C" />
      <clipPath id="chipClip">
        <rect x={cx - 26} y={CY - 26} width="52" height="52" rx="12" />
      </clipPath>
      <g clipPath="url(#chipClip)">
        <rect x={cx - 26} y={CY - 26} width="52" height="52" fill="#181A1F" />
        <circle cx={cx} cy={CY + 34} r="34" fill="#000000" stroke="#ECECF1" strokeWidth="3" />
      </g>
    </svg>
  )
}
