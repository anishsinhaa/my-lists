import { PosterImage } from '@/components/common/PosterImage'
import { RatingBadge } from '@/components/common/RatingBadge'
import { StatusChip } from '@/components/common/StatusChip'
import { displayTitle } from '@/lib/displayTitle'
import { externalRatingLabel } from '@/lib/rating'
import type { PosterCardProps } from '../views/PosterCard'
import { CardCaption } from './MovieCard'

export function AnimeCard({ item, index, onOpen }: PosterCardProps) {
  const tilt = index % 2 === 0 ? '-rotate-[1.5deg]' : 'rotate-[1.5deg]'
  return (
    <button type="button" className={`block w-full cursor-pointer text-left transition-transform hover:rotate-0 ${tilt}`} onClick={() => onOpen?.(item)}>
      <span className="relative block border-[3px] border-(--ink) shadow-[5px_5px_0_var(--ink)]">
        <PosterImage alt="" kind="anime" src={item.poster} title={displayTitle(item.title, item.year)} />
        <span className="absolute top-2 right-2 -rotate-6"><StatusChip size="sm" status={item.status} /></span>
        <span className="absolute bottom-2 left-2"><RatingBadge externalLabel={externalRatingLabel('anime')} externalRating={item.imdbRating} myRating={item.myRating} /></span>
      </span>
      <CardCaption item={item} />
    </button>
  )
}
