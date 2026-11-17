import { useRef } from 'react'
import { PosterImage } from '@/components/common/PosterImage'
import { thumbnailUrl } from '@/design/archive'
import type { PosterCardProps } from '../views/PosterCard'
import { CardCaption } from './MovieCard'

export function GameCard({ item, onOpen }: PosterCardProps) {
  const box = useRef<HTMLSpanElement>(null)
  const score = item.imdbRating !== null && item.imdbRating > 0 ? item.imdbRating : null
  const tone = score === null ? '' : score >= 75 ? 'text-emerald-300' : score >= 50 ? 'text-amber-200' : 'text-red-300'
  return (
    <button
      type="button"
      className="block w-full text-left"
      onClick={() => onOpen?.(item)}
      onPointerMove={(event) => {
        const node = box.current
        if (node === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const rect = node.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width
        const y = (event.clientY - rect.top) / rect.height
        node.style.setProperty('--tilt-y', `${(x - 0.5) * 18}deg`)
        node.style.setProperty('--tilt-x', `${(0.5 - y) * 8}deg`)
      }}
      onPointerLeave={() => {
        box.current?.style.removeProperty('--tilt-y')
        box.current?.style.removeProperty('--tilt-x')
      }}
    >
      <span ref={box} className="game-box relative block bg-[#100e21] shadow-[12px_16px_24px_#00000088]">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-3 bg-[#2b2760]" />
        <PosterImage alt="" kind="game" src={thumbnailUrl(item.poster, 'w342')} title={item.title} />
        <span className="absolute right-2 bottom-2 rounded-sm bg-black/70 px-1 text-[10px] tracking-widest text-white">PC</span>
        {score === null ? null : <span className={`absolute top-2 right-2 rounded-sm bg-black/70 px-1 text-xs ${tone}`}>{score}</span>}
      </span>
      <CardCaption item={item} />
    </button>
  )
}
