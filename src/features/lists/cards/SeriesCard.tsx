import { PosterImage } from '@/components/common/PosterImage'
import { StatusChip } from '@/components/common/StatusChip'
import { displayTitle } from '@/lib/displayTitle'
import type { PosterCardProps } from '../views/PosterCard'
import { CardCaption } from './MovieCard'

export function SeriesCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className="block w-full cursor-pointer text-left transition-transform duration-300 ease-out hover:-translate-y-3" onClick={() => onOpen?.(item)}>
      <span className="relative block overflow-hidden rounded-[22px] shadow-(--shadow-card) transition-shadow duration-300 hover:shadow-[0_18px_28px_#00000080]">
        <PosterImage alt="" byline={item.creator ?? (item.year === null ? '' : String(item.year))} kind="series" src={item.poster} title={displayTitle(item.title, item.year)} />
        <span className="absolute top-2 left-2"><StatusChip size="sm" status={item.status} /></span>
      </span>
      <CardCaption item={item} />
    </button>
  )
}
