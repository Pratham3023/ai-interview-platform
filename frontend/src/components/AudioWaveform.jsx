import React, { useEffect, useRef } from 'react'

/**
 * Animated High-Fidelity Voice Waveform
 * Uses HTML5 Canvas for 60fps responsive frequency visualization.
 * Smoothly scales to container width.
 */
export default function AudioWaveform({ isActive = false, height = 48, barCount = 36 }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const phaseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let isRunning = true

    const render = () => {
      if (!isRunning) return

      const width = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, width, h)

      phaseRef.current += isActive ? 0.12 : 0.02
      const phase = phaseRef.current

      const barWidth = Math.max(3, (width / barCount) - 3)
      const gap = 3
      const totalWidth = barCount * (barWidth + gap)
      const startX = (width - totalWidth) / 2

      // Create vertical gradient
      ctx.fillStyle = '#ECECF1'

      for (let i = 0; i < barCount; i++) {
        const x = startX + i * (barWidth + gap)
        const norm = i / barCount

        // Harmonic wave combinations for organic voice motion
        let amp
        if (isActive) {
          const w1 = Math.sin(phase + i * 0.35)
          const w2 = Math.cos(phase * 1.4 + i * 0.2)
          const w3 = Math.sin(phase * 0.7 + i * 0.5)
          const centerWeight = Math.sin(norm * Math.PI) // higher in center
          amp = (Math.abs(w1 * 0.5 + w2 * 0.3 + w3 * 0.2) * 0.8 + 0.15) * centerWeight
        } else {
          // Subtle idle pulse
          const idleWave = Math.sin(phase + i * 0.2)
          amp = 0.08 + Math.abs(idleWave) * 0.08
        }

        const barH = Math.max(4, amp * (h - 8))
        const y = (h - barH) / 2
        const radius = barWidth / 2

        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barH, radius)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      isRunning = false
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [isActive, barCount])

  // Handle responsive resize of canvas resolution
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * window.devicePixelRatio || 300
        canvas.height = height * window.devicePixelRatio || 48
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [height])

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          maxWidth: 420,
          height: `${height}px`,
          display: 'block',
          opacity: isActive ? 1 : 0.45,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  )
}
