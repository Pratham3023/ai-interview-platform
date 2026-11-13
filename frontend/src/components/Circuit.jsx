import React from 'react'

/*
 * Decorative circuit: subject tiles on both sides feed traces into a central
 * "interviewer" chip. Orange pulses travel along the traces toward the chip.
 * Drawn in a 1200×300 box and scaled to fit whatever height the hero leaves.
 */

const CX = 600, CY = 150          // chip centre
const CHIP = 104                  // chip size

const NODES = [
  { label: 'DBMS',          x: 170,  y: 44,  side: 'L' },
  { label: 'DSA',           x: 80,   y: 150, side: 'L' },
  { label: 'OS',            x: 190,  y: 256, side: 'L' },
  { label: 'Networks',      x: 1010, y: 44,  side: 'R' },
  { label: 'Python',        x: 1110, y: 150, side: 'R' },
  { label: 'System design', x: 990,  y: 256, side: 'R' },
]

// Path from a node to a pin on the chip's side: horizontal, a 45° bend, then horizontal.
function trace(n, i) {
  const dir = n.side === 'L' ? 1 : -1
  const pinX = CX - dir * (CHIP / 2)
  const pinY = CY - 30 + (i % 3) * 30
  const startX = n.x + dir * (nodeWidth(n.label) / 2)
  const bendX = pinX - dir * (80 + (i % 3) * 30)
  const dy = pinY - n.y
  const runX = bendX - dir * Math.abs(dy)
  return `M ${startX} ${n.y} H ${runX} L ${bendX} ${pinY} H ${pinX}`
}

function nodeWidth(label) {
  return Math.max(84, label.length * 12.5 + 44)
}

// Short legs out of the chip's bottom, like the reference's bus lines.
const LEGS = [-36, -12, 12, 36].map(dx => `M ${CX + dx} ${CY + CHIP / 2} V 300`)

export default function Circuit() {
  return (
    <svg className="circuit-svg" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="chipEdge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB15C" />
          <stop offset="0.5" stopColor="#3A2A20" />
          <stop offset="1" stopColor="#FF6A2B" />
        </linearGradient>
        <radialGradient id="chipGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FF6A2B" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FF6A2B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="legFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8240" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FF8240" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* base traces */}
      <g fill="none" stroke="#2A2C33" strokeWidth="1.5">
        {NODES.map((n, i) => <path key={n.label} d={trace(n, i)} />)}
        {LEGS.map(d => <path key={d} d={d} />)}
      </g>

      {/* travelling pulses */}
      <g fill="none" stroke="#FF8240" strokeWidth="2" strokeLinecap="round" className="pulses">
        {NODES.map((n, i) => (
          <path key={n.label} d={trace(n, i)} pathLength="100" style={{ animationDelay: `${i * 0.55}s` }} />
        ))}
      </g>
      <g fill="none" stroke="url(#legFade)" strokeWidth="1.5">
        {LEGS.map(d => <path key={d} d={d} />)}
      </g>

      {/* subject tiles */}
      {NODES.map(n => {
        const w = nodeWidth(n.label)
        return (
          <g key={n.label} transform={`translate(${n.x - w / 2} ${n.y - 28})`}>
            <rect width={w} height="56" rx="14" fill="#121317" stroke="#2C2E35" />
            <text x={w / 2} y="35" textAnchor="middle" fill="#D4D4DA" fontSize="21" fontFamily="Geist, system-ui, sans-serif" fontWeight="500">
              {n.label}
            </text>
          </g>
        )
      })}

      {/* chip */}
      <circle cx={CX} cy={CY} r="130" fill="url(#chipGlow)" />
      <rect x={CX - CHIP / 2} y={CY - CHIP / 2} width={CHIP} height={CHIP} rx="26" fill="#121317" stroke="url(#chipEdge)" strokeWidth="1.5" />
      <rect x={CX - CHIP / 2 + 10} y={CY - CHIP / 2 + 10} width={CHIP - 20} height={CHIP - 20} rx="18" fill="#0C0D10" stroke="#24262C" />
      {/* the logo's eclipse, inside the chip */}
      <clipPath id="chipClip">
        <rect x={CX - 26} y={CY - 26} width="52" height="52" rx="12" />
      </clipPath>
      <g clipPath="url(#chipClip)">
        <rect x={CX - 26} y={CY - 26} width="52" height="52" fill="#181A1F" />
        <circle cx={CX} cy={CY + 34} r="34" fill="#08090B" stroke="#FF8240" strokeWidth="3" />
      </g>
    </svg>
  )
}
