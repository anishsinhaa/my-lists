import { PosterImage } from '@/components/common/PosterImage'
import { RatingBadge } from '@/components/common/RatingBadge'
import { externalRatingLabel } from '@/lib/rating'
import type { MediaItem } from '@/types/media'
import type { PosterCardProps } from '../views/PosterCard'

export function MovieCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className="grain group block w-full text-left" onClick={() => onOpen?.(item)}>
      <span className="relative block overflow-hidden rounded-[6px] border border-border transition-transform duration-300 group-hover:scale-[1.04]">
        <PosterImage alt="" kind="movie" src={item.poster} title={item.title} />
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
      <span className="block truncate text-sm">{item.title}</span>
      <span className="text-xs text-(--ink-muted)">{item.year ?? ''}</span>
    </span>
  )
}
