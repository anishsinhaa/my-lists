import { PosterImage } from '@/components/common/PosterImage'
import { displayTitle } from '@/lib/displayTitle'
import type { PosterCardProps } from '../views/PosterCard'

export function BookCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className="book-card group isolate block w-full cursor-pointer text-left" onClick={() => onOpen?.(item)}>
      <span className="book-stage relative block">
        <span aria-hidden="true" className="book-pages" />
        <span className="book-cover paper spine relative block">
          <PosterImage alt="" byline={item.creator ?? (item.year === null ? '' : String(item.year))} kind="book" src={item.poster} title={displayTitle(item.title, item.year)} />
          <span aria-hidden="true" className="absolute top-0 right-4 h-10 w-3 bg-accent" />
        </span>
      </span>
      <span className="mt-1 block font-(--font-display) text-sm">{displayTitle(item.title, item.year)}</span>
      <span className="block text-xs text-(--ink-muted)">{item.creator ?? item.year ?? ''}</span>
    </button>
  )
}
