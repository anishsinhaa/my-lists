import { PosterImage } from '@/components/common/PosterImage'
import { displayTitle } from '@/lib/displayTitle'
import type { MediaItem } from '@/types/media'
import type { PosterCardProps } from '../views/PosterCard'

export function MovieCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className="group isolate z-0 block w-full cursor-pointer text-left hover:z-10 focus-visible:z-10" onClick={() => onOpen?.(item)}>
      <span className="relative block origin-bottom overflow-hidden rounded-[6px] shadow-[0_12px_30px_#00000080] transition-transform duration-300 group-hover:scale-[1.04] group-hover:ring-2 group-hover:ring-(--accent) group-hover:ring-offset-2 group-hover:ring-offset-(--bg) group-focus-visible:ring-2 group-focus-visible:ring-(--accent) group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-(--bg)">
        <PosterImage alt="" byline={item.creator ?? (item.year === null ? '' : String(item.year))} kind="movie" src={item.poster} title={displayTitle(item.title, item.year)} />
        <span className="vignette pointer-events-none absolute inset-x-0 bottom-0 h-1/2" />
      </span>
      <CardCaption className="mt-2" item={item} />
    </button>
  )
}

export function CardCaption({ item, className = 'mt-1', clamp = false }: { item: MediaItem; className?: string; clamp?: boolean }) {
  return (
    <span className={`block ${className}`}>
      <span className={`block text-sm ${clamp ? 'line-clamp-2 min-h-[2.5rem]' : 'truncate'}`}>{displayTitle(item.title, item.year)}</span>
      <span className="text-xs text-(--ink-muted)">{item.year ?? ''}</span>
    </span>
  )
}
