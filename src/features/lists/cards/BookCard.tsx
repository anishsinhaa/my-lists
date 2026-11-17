import { PosterImage } from '@/components/common/PosterImage'
import { RatingBadge } from '@/components/common/RatingBadge'
import { externalRatingLabel } from '@/lib/rating'
import type { PosterCardProps } from '../views/PosterCard'

export function BookCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className="block w-full text-left" onClick={() => onOpen?.(item)}>
      <span className="paper spine relative block overflow-hidden shadow-(--shadow-card)">
        <PosterImage alt="" kind="book" src={item.poster} title={item.title} />
        <span className="absolute bottom-2 left-3"><RatingBadge externalLabel={externalRatingLabel('books')} externalRating={item.imdbRating} myRating={item.myRating} /></span>
      </span>
      <span className="mt-1 block font-(--font-display) text-sm">{item.title}</span>
      <span className="block text-xs text-(--ink-muted)">{item.creator ?? item.year ?? ''}</span>
    </button>
  )
}
