import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { edgeScrollSpeed } from './archive'

export function Rail({ label, children }: { label: string; children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null)
  const speed = useRef(0)
  const hovering = useRef(false)
  const frame = useRef(0)

  useEffect(() => {
    const node = scroller.current
    if (node === null) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(pointer: fine)').matches
    if (reduced || !fine) return undefined
    const tick = () => {
      if (speed.current !== 0 && !hovering.current) node.scrollLeft += speed.current
      if (speed.current === 0) {
        frame.current = 0
        return
      }
      frame.current = requestAnimationFrame(tick)
    }
    const onMove = (event: PointerEvent) => {
      const box = node.getBoundingClientRect()
      speed.current = edgeScrollSpeed(event.clientX - box.left, box.width)
      if (speed.current !== 0 && frame.current === 0) frame.current = requestAnimationFrame(tick)
    }
    const onLeave = () => {
      speed.current = 0
    }
    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame.current)
    }
  }, [])

  function nudge(direction: number) {
    scroller.current?.scrollBy({ left: direction * 280, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return (
    <div className="group/rail relative">
      <button type="button" aria-label={`Scroll ${label} left`} className="absolute top-1/2 left-1 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-(--brass)/50 bg-black/60 text-white md:flex" onClick={() => nudge(-1)}>
        <ChevronLeft aria-hidden="true" />
      </button>
      <div
        ref={scroller}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 py-2 focus-visible:outline-2 focus-visible:outline-(--brass) [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') nudge(1)
          if (event.key === 'ArrowLeft') nudge(-1)
        }}
        onPointerOver={(event) => {
          const target = event.target
          hovering.current = target instanceof Element && target.closest('[data-rail-card]') !== null
        }}
      >
        {children}
      </div>
      <button type="button" aria-label={`Scroll ${label} right`} className="absolute top-1/2 right-1 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-(--brass)/50 bg-black/60 text-white md:flex" onClick={() => nudge(1)}>
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  )
}
