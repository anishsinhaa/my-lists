import { PosterImage } from '@/components/common/PosterImage'
import { RatingBadge } from '@/components/common/RatingBadge'
import { displayTitle } from '@/lib/displayTitle'
import { externalRatingLabel } from '@/lib/rating'
import type { PosterCardProps } from '../views/PosterCard'
import { CARD_POSTER, cardHoverClass } from './cardHover'

export function BookCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className={`block w-full text-left ${cardHoverClass()}`} onClick={() => onOpen?.(item)}>
      <span className={`${CARD_POSTER} paper spine relative block overflow-hidden shadow-(--shadow-card)`}>
        <PosterImage alt="" kind="book" src={item.poster} title={displayTitle(item.title, item.year)} />
        <span aria-hidden="true" className="absolute top-0 right-4 h-10 w-3 bg-accent" />
        <span className="absolute bottom-2 left-3"><RatingBadge externalLabel={externalRatingLabel('books')} externalRating={item.imdbRating} myRating={item.myRating} /></span>
      </span>
      <span className="mt-1 block font-(--font-display) text-sm">{displayTitle(item.title, item.year)}</span>
      <span className="block text-xs text-(--ink-muted)">{item.creator ?? item.year ?? ''}</span>
    </button>
  )
}
