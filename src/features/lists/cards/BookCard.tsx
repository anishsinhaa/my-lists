import { PosterImage } from '@/components/common/PosterImage'
import { displayTitle } from '@/lib/displayTitle'
import type { PosterCardProps } from '../views/PosterCard'

export function BookCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className="book-card relative isolate block w-full cursor-pointer text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)" onClick={() => onOpen?.(item)}>
      <span className="book-stage relative block">
        <span className="book-cover relative block">
          <span className="book-face rounded-[6px]">
            <PosterImage alt="" byline={item.creator ?? (item.year === null ? '' : String(item.year))} className="rounded-[6px]" kind="book" src={item.poster} title={displayTitle(item.title, item.year)} />
          </span>
        </span>
      </span>
      <span className="mt-1 block font-(--font-display) text-sm">{displayTitle(item.title, item.year)}</span>
      <span className="block text-xs text-(--ink-muted)">{item.creator ?? item.year ?? ''}</span>
    </button>
  )
}
