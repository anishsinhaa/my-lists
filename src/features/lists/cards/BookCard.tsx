import { PosterImage } from '@/components/common/PosterImage'
import { displayTitle } from '@/lib/displayTitle'
import type { PosterCardProps } from '../views/PosterCard'

export function BookCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className="group block w-full cursor-pointer text-left [perspective:900px]" onClick={() => onOpen?.(item)}>
      <span className="paper spine relative block origin-left overflow-hidden shadow-(--shadow-card) transition-transform duration-500 ease-out group-hover:[transform:rotateY(-16deg)_translateX(8px)]">
        <PosterImage alt="" byline={item.creator ?? (item.year === null ? '' : String(item.year))} kind="book" src={item.poster} title={displayTitle(item.title, item.year)} />
        <span aria-hidden="true" className="absolute top-0 right-4 h-10 w-3 bg-accent" />
      </span>
      <span className="mt-1 block font-(--font-display) text-sm">{displayTitle(item.title, item.year)}</span>
      <span className="block text-xs text-(--ink-muted)">{item.creator ?? item.year ?? ''}</span>
    </button>
  )
}
