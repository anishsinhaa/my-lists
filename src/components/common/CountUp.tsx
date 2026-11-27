import { useEffect, useState } from 'react'

export function CountUp({ value, durationMs = 600 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(value)

  useEffect(() => {
    if (durationMs <= 0) {
      setShown(value)
      return
    }
    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - progress) ** 3
      setShown(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [durationMs, value])

  return <span>{shown}</span>
}
