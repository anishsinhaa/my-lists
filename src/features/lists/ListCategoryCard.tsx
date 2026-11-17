import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PosterFallback } from '@/components/common/PosterFallback'
import { effectiveRating } from '@/lib/rating'
import { LIST_KIND, TAB_NAME, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { THEME_SPECS } from '@/themes/themeSpecs'

const CARD_LISTS = ['movies', 'series', 'anime', 'games', 'books'] as const
export type CardListId = (typeof CARD_LISTS)[number]

export function postersFor(items: MediaItem[]): string[] {
  return items
    .flatMap((item) => (item.poster === null ? [] : [{ poster: item.poster, rating: effectiveRating(item) ?? -1, key: item.titleKey }]))
    .sort((left, right) => right.rating - left.rating || left.key.localeCompare(right.key))
    .slice(0, 4)
    .map((item) => item.poster)
}

export function ListCategoryCard({ listId, count, posters, to, variant, items }: { listId: CardListId; count: number; posters: string[]; to: string; variant: 'tile' | 'fullscreen'; items: MediaItem[] }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, on: false })
  const spec = THEME_SPECS[listId]
  const groups = items.reduce<Record<string, number>>((map, item) => {
    map[item.statusGroup] = (map[item.statusGroup] ?? 0) + 1
    return map
  }, {})
  return (
    <Link
      to={to}
      data-theme={listId}
      className={`block overflow-hidden border bg-(--surface) text-(--ink) ${variant === 'fullscreen' ? 'h-[calc(100dvh-7.5rem)]' : 'min-h-64'}`}
      style={{ borderRadius: spec.radiusPx, borderColor: spec.colors.border, transform: tilt.on ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-4px)` : undefined }}
      onMouseLeave={() => setTilt({ x: 0, y: 0, on: false })}
      onMouseMove={variant === 'tile' ? (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const px = (event.clientX - rect.left) / rect.width - 0.5
        const py = (event.clientY - rect.top) / rect.height - 0.5
        setTilt({ x: Math.max(-6, Math.min(6, py * -12)), y: Math.max(-6, Math.min(6, px * 12)), on: true })
      } : undefined}
    >
      <div className="grid h-40 grid-cols-2">
        {(posters.length > 0 ? posters : ['', '', '', '']).slice(0, 4).map((poster, index) => (
          poster.length > 0
            ? <img key={poster} alt="" className="h-full w-full object-cover" src={poster} />
            : <PosterFallback key={index} kind={LIST_KIND[listId]} title={TAB_NAME[listId]} />
        ))}
      </div>
      <div className="p-4">
        <h2 className="font-(--font-display) text-3xl">{TAB_NAME[listId]}</h2>
        <p>{count}</p>
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-(--surface-2)">
          {Object.entries(groups).map(([group, value]) => <span key={group} className="bg-accent" style={{ width: `${(value / Math.max(count, 1)) * 100}%` }} />)}
        </div>
      </div>
    </Link>
  )
}

export function isCardList(id: ListId): id is CardListId {
  return (CARD_LISTS as readonly string[]).includes(id)
}
