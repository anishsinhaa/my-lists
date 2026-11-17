import { useState } from 'react'
import { Star } from 'lucide-react'

function same(left: number | null, right: number): boolean {
  return left !== null && Math.abs(left - right) < 0.01
}

function amount(shown: number | null, index: number): 0 | 0.5 | 1 {
  if (shown === null) return 0
  if (shown >= index) return 1
  if (shown >= index - 0.5) return 0.5
  return 0
}

function Face({ fill, pop }: { fill: 0 | 0.5 | 1; pop: boolean }) {
  return (
    <span className={`star-face relative block size-5 ${pop ? 'is-pop' : ''} ${fill > 0 ? 'is-lit' : ''}`}>
      <Star aria-hidden="true" className="size-5 text-(--ink-muted)" />
      <span className="absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-150" style={{ width: fill === 1 ? '100%' : fill === 0.5 ? '50%' : '0%' }}>
        <Star aria-hidden="true" className="size-5 fill-(--accent) text-(--accent)" />
      </span>
    </span>
  )
}

export function StarRating({ value, onChange }: { value: number | null; onChange: (next: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const [burst, setBurst] = useState<number | null>(null)
  const shown = hover ?? value

  function choose(next: number) {
    setBurst(next)
    onChange(same(value, next) ? null : next)
  }

  return (
    <div className="star-rate flex w-full max-w-md flex-col gap-1" onPointerLeave={() => setHover(null)}>
      <div className="grid grid-cols-10">
        {Array.from({ length: 10 }, (_, index) => {
          const star = index + 1
          const fill = amount(shown, star)
          return (
            <span key={star} className="relative h-11" data-lit={fill === 1 ? 'full' : fill === 0.5 ? 'half' : 'empty'}>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Face fill={fill} pop={burst !== null && Math.abs(burst - star) < 1 && fill > 0} />
              </span>
              <button type="button" aria-label={`Rate ${star - 0.5}`} className="absolute inset-y-0 left-0 w-1/2" onPointerEnter={() => setHover(star - 0.5)} onClick={() => choose(star - 0.5)} />
              <button type="button" aria-label={`Rate ${star}`} className="absolute inset-y-0 right-0 w-1/2" onPointerEnter={() => setHover(star)} onClick={() => choose(star)} />
            </span>
          )
        })}
      </div>
      <button type="button" className="min-h-11 self-start px-2 text-sm text-(--ink-muted)" disabled={value === null} onClick={() => { setHover(null); setBurst(null); onChange(null) }}>Clear</button>
    </div>
  )
}
