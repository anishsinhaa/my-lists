import { PosterImage } from '@/components/common/PosterImage'
import { StatusChip } from '@/components/common/StatusChip'
import { displayTitle } from '@/lib/displayTitle'
import type { PosterCardProps } from '../views/PosterCard'
import { CardCaption } from './MovieCard'

export function AnimeCard({ item, index, onOpen }: PosterCardProps) {
  const tilt = index % 2 === 0 ? '-rotate-[1.5deg]' : 'rotate-[1.5deg]'
  return (
    <button type="button" className={`block w-full cursor-pointer text-left transition-transform hover:rotate-0 ${tilt}`} onClick={() => onOpen?.(item)}>
      <span className="relative block border-[3px] border-(--ink) shadow-[5px_5px_0_var(--ink)]">
        <PosterImage alt="" byline={item.creator ?? (item.year === null ? '' : String(item.year))} kind="anime" src={item.poster} title={displayTitle(item.title, item.year)} />
        <span className="absolute top-2 left-2 max-w-[calc(100%-1rem)] truncate"><StatusChip listId="anime" size="sm" status={item.status} /></span>
      </span>
      <CardCaption clamp item={item} />
    </button>
  )
}
