import { PosterImage } from '@/components/common/PosterImage'
import { RatingBadge } from '@/components/common/RatingBadge'
import { StatusChip } from '@/components/common/StatusChip'
import { displayTitle } from '@/lib/displayTitle'
import { externalRatingLabel } from '@/lib/rating'
import type { PosterCardProps } from '../views/PosterCard'
import { CARD_POSTER, cardHoverClass } from './cardHover'
import { CardCaption } from './MovieCard'

export function SeriesCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className={`block w-full text-left ${cardHoverClass()}`} onClick={() => onOpen?.(item)}>
      <span className={`${CARD_POSTER} relative block overflow-hidden rounded-[22px] shadow-(--shadow-card)`}>
        <PosterImage alt="" kind="series" src={item.poster} title={displayTitle(item.title, item.year)} />
        <span className="absolute top-2 left-2"><StatusChip size="sm" status={item.status} /></span>
        <span className="ticket-chip absolute bottom-2 left-2 bg-accent px-2 py-0.5 text-(--bg)">
          <RatingBadge externalLabel={externalRatingLabel(item.listId)} externalRating={item.imdbRating} myRating={item.myRating} />
        </span>
      </span>
      <CardCaption item={item} />
    </button>
  )
}
