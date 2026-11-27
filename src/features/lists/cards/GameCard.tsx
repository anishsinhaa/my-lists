import { useRef } from 'react'
import { PosterImage } from '@/components/common/PosterImage'
import { thumbnailUrl } from '@/design/archive'
import { displayTitle } from '@/lib/displayTitle'
import type { PosterCardProps } from '../views/PosterCard'
import { CardCaption } from './MovieCard'

export function GameCard({ item, onOpen }: PosterCardProps) {
  const box = useRef<HTMLSpanElement>(null)
  return (
    <button
      type="button"
      className="group block w-full cursor-pointer text-left"
      onClick={() => onOpen?.(item)}
      onPointerMove={(event) => {
        const node = box.current
        if (node === null) return
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
      <span ref={box} className="game-box relative block bg-[#100e21] shadow-[12px_16px_24px_#00000088] transition-shadow duration-200 group-hover:shadow-[0_0_28px_rgba(0,240,255,0.55)]">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-3 bg-[#2b2760]" />
        <PosterImage alt="" byline={item.creator ?? (item.year === null ? '' : String(item.year))} className="overflow-hidden rounded-[4px]" kind="game" src={thumbnailUrl(item.poster, 'w342')} title={displayTitle(item.title, item.year)} />
        {item.platform !== null && item.platform.trim().length > 0 ? <span className="absolute right-2 bottom-2 rounded-sm bg-black/70 px-1 text-[10px] tracking-widest text-white">{item.platform}</span> : null}
      </span>
      <CardCaption item={item} />
    </button>
  )
}
