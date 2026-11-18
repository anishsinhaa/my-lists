import { PosterImage } from '@/components/common/PosterImage'
import { RatingBadge } from '@/components/common/RatingBadge'
import { displayTitle } from '@/lib/displayTitle'
import { externalRatingLabel } from '@/lib/rating'
import type { MediaItem } from '@/types/media'
import type { PosterCardProps } from '../views/PosterCard'
import { CARD_POSTER, cardHoverClass } from './cardHover'

export function MovieCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className={`grain block w-full text-left ${cardHoverClass()}`} onClick={() => onOpen?.(item)}>
      <span className={`${CARD_POSTER} relative block overflow-hidden rounded-[6px] border-2 border-[#d4af37] shadow-[0_12px_30px_#00000080]`}>
        <PosterImage alt="" kind="movie" src={item.poster} title={displayTitle(item.title, item.year)} />
        <span className="vignette pointer-events-none absolute inset-x-0 bottom-0 h-1/2" />
        <span className="absolute bottom-2 left-2"><RatingBadge externalLabel={externalRatingLabel(item.listId)} externalRating={item.imdbRating} myRating={item.myRating} /></span>
      </span>
      <CardCaption item={item} />
    </button>
  )
}

export function CardCaption({ item }: { item: MediaItem }) {
  return (
    <span className="mt-1 block">
      <span className="block truncate text-sm">{displayTitle(item.title, item.year)}</span>
      <span className="text-xs text-(--ink-muted)">{item.year ?? ''}</span>
    </span>
  )
}
