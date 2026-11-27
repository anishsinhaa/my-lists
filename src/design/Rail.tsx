import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { edgeScrollSpeed } from './archive'

export function Rail({ label, children, align = 'center' }: { label: string; children: ReactNode; align?: 'center' | 'start' }) {
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const speed = useRef(0)
  const hovering = useRef(false)
  const frame = useRef(0)
  const overflowRef = useRef(false)
  const [overflow, setOverflow] = useState(false)

  useEffect(() => {
    const node = scroller.current
    const inner = track.current
    if (node === null || inner === null) return undefined
    const measure = () => {
      const styles = getComputedStyle(inner)
      const gap = Number.parseFloat(styles.columnGap) || 0
      const content = [...inner.children].reduce((sum, child) => sum + (child as HTMLElement).offsetWidth, 0) + Math.max(0, inner.children.length - 1) * gap
      const next = content > node.clientWidth + 2
      overflowRef.current = next
      setOverflow((current) => (current === next ? current : next))
    }
    const observer = new ResizeObserver(() => measure())
    observer.observe(node)
    observer.observe(inner)
    const id = requestAnimationFrame(measure)
    return () => {
      cancelAnimationFrame(id)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const node = scroller.current
    if (node === null) return undefined
    const fine = window.matchMedia('(pointer: fine)').matches
    if (!fine) return undefined
    const tick = () => {
      if (speed.current !== 0 && !hovering.current && overflowRef.current) node.scrollLeft += speed.current
      if (speed.current === 0 || !overflowRef.current) {
        frame.current = 0
        return
      }
      frame.current = requestAnimationFrame(tick)
    }
    const onMove = (event: PointerEvent) => {
      if (!overflowRef.current) {
        speed.current = 0
        return
      }
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
    scroller.current?.scrollBy({ left: direction * 280, behavior: 'smooth' })
  }

  return (
    <div className="@container group/rail relative">
      {overflow ? (
        <button type="button" aria-label={`Scroll ${label} left`} className="absolute top-1/2 left-1 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-(--brass)/50 bg-black/60 text-white md:flex" onClick={() => nudge(-1)}>
          <ChevronLeft aria-hidden="true" />
        </button>
      ) : null}
      <div
        ref={scroller}
        data-rail-scroller="true"
        role="region"
        aria-label={label}
        tabIndex={0}
        className={`focus-visible:outline-2 focus-visible:outline-(--brass) ${overflow ? 'overflow-x-auto scroll-smooth mask-[linear-gradient(to_right,transparent,black_3.5rem,black_calc(100%-3.5rem),transparent)]' : 'overflow-x-hidden'}`}
        onKeyDown={(event) => {
          if (!overflow) return
          if (event.key === 'ArrowRight') nudge(1)
          if (event.key === 'ArrowLeft') nudge(-1)
        }}
        onPointerOver={(event) => {
          const target = event.target
          hovering.current = target instanceof Element && target.closest('[data-rail-card]') !== null
        }}
      >
        <div ref={track} className={`flex w-max min-w-full items-stretch gap-[clamp(0.75rem,1.5vw,1.25rem)] py-4 ${overflow || align === 'start' ? 'justify-start' : 'justify-center'} ${overflow ? 'px-14' : 'px-[clamp(0.75rem,2vw,1.5rem)]'}`}>
          {children}
        </div>
      </div>
      {overflow ? (
        <button type="button" aria-label={`Scroll ${label} right`} className="absolute top-1/2 right-1 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-(--brass)/50 bg-black/60 text-white md:flex" onClick={() => nudge(1)}>
          <ChevronRight aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
