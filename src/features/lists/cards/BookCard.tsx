import { PosterImage } from '@/components/common/PosterImage'
import { displayTitle } from '@/lib/displayTitle'
import type { PosterCardProps } from '../views/PosterCard'

export function BookCard({ item, onOpen }: PosterCardProps) {
  return (
    <button type="button" className="group isolate block w-full cursor-pointer text-left" onClick={() => onOpen?.(item)}>
      <span className="relative block overflow-hidden shadow-(--shadow-card) transition-shadow duration-200 ease-out [perspective:1000px] [@media(hover:hover)]:group-hover:shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--ink)_32%,transparent)]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-20 w-3 border-l border-(--border) bg-[repeating-linear-gradient(90deg,color-mix(in_srgb,var(--ink)_18%,var(--surface))_0_1px,var(--surface)_1px_4px)] opacity-0 transition-opacity duration-200 ease-out [@media(hover:hover)]:motion-safe:group-hover:opacity-100" />
        <span className="paper spine relative block origin-[left_center] transform-gpu transition-transform duration-200 ease-out motion-reduce:transform-none [@media(hover:hover)]:motion-safe:group-hover:z-10 [@media(hover:hover)]:motion-safe:group-hover:will-change-transform [@media(hover:hover)]:motion-safe:group-hover:[transform:translateY(-4px)_scale(1.02)_rotateY(-12deg)]">
          <PosterImage alt="" byline={item.creator ?? (item.year === null ? '' : String(item.year))} kind="book" src={item.poster} title={displayTitle(item.title, item.year)} />
          <span aria-hidden="true" className="absolute top-0 right-4 h-10 w-3 bg-accent" />
        </span>
      </span>
      <span className="mt-1 block font-(--font-display) text-sm">{displayTitle(item.title, item.year)}</span>
      <span className="block text-xs text-(--ink-muted)">{item.creator ?? item.year ?? ''}</span>
    </button>
  )
}
