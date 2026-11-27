import { useEffect, useRef, useState } from 'react'
import { useLoadingSignal } from '@/hooks/useLoadingSignal'
import { stepBar, type BarPhase, type BarTiming } from './topBarTiming'

export function TopLoadingBar() {
  const loading = useLoadingSignal()
  const timing = useRef<BarTiming>({ startedAt: null, shownAt: null })
  const [phase, setPhase] = useState<BarPhase>('hidden')

  useEffect(() => {
    const tick = () => {
      const next = stepBar(timing.current, loading, Date.now())
      timing.current = { startedAt: next.startedAt, shownAt: next.shownAt }
      setPhase(next.phase)
    }
    tick()
    const id = window.setInterval(tick, 30)
    return () => window.clearInterval(id)
  }, [loading])

  if (phase === 'hidden') return null
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-busy="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] ${phase === 'fading' ? 'opacity-0 transition-opacity duration-200' : 'opacity-100'}`}
    >
      <div className="ml-top-bar" />
    </div>
  )
}
