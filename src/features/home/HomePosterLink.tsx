import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { PosterImage } from '@/components/common/PosterImage'
import { StatusBadge } from '@/design/StatusBadge'
import { thumbnailUrl, visibleRating } from '@/design/archive'
import { CARD_POSTER, cardHoverClass } from '@/features/lists/cards/cardHover'
import { itemHref } from '@/features/home/tonight'
import { displayTitle } from '@/lib/displayTitle'
import { PREVIEW_DELAY, PREVIEW_HEIGHT, PREVIEW_WIDTH, previewBox } from './previewBox'
import { LIST_KIND, TAB_NAME } from '@/types/lists'
import type { MediaItem } from '@/types/media'

function matches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

function firstLine(value: string): string {
  return value.split(/\r?\n/).map((part) => part.trim()).find((part) => part.length > 0) ?? ''
}

function PosterPreview({ item, anchor }: { item: MediaItem; anchor: { top: number; left: number; right: number; bottom: number } }) {
  const rating = visibleRating(item)
  const description = firstLine(item.why)
  const notes = item.notes.trim()
  const place = previewBox(anchor, { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }, { width: window.innerWidth, height: window.innerHeight })
  const reduce = matches('(prefers-reduced-motion: reduce)')
  return createPortal(
    <motion.div
      data-testid="poster-preview"
      className="pointer-events-none fixed z-[80] overflow-hidden rounded-md border border-(--brass)/50 bg-[#17130f] text-[#f4ead8] shadow-[0_18px_40px_#00000088]"
      style={{ top: place.top, left: place.left, width: PREVIEW_WIDTH, maxHeight: 'calc(100dvh - 16px)' }}
      initial={reduce ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.22 }}
    >
      <PosterImage alt="" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w342')} title={displayTitle(item.title, item.year)} />
      <div className="space-y-2 p-3">
        <p className="font-['Cinzel',serif] text-sm">{displayTitle(item.title, item.year)}</p>
        <p className="text-xs text-(--ink-muted)">{item.year ?? 'Year unknown'} · {TAB_NAME[item.listId]}</p>
        {item.status.trim().length === 0 ? null : <StatusBadge listId={item.listId} status={item.status} />}
        {item.genres.length === 0 ? null : (
          <p className="flex flex-wrap gap-1">
            {item.genres.map((genre) => <span key={genre} className="rounded-full border border-(--brass)/50 px-2 py-0.5 text-[11px]">{genre}</span>)}
          </p>
        )}
        {rating.my === null && rating.external === null ? null : (
          <p className="text-xs leading-tight">
            {rating.external === null ? null : <span className="block text-(--ink-muted)">{rating.externalLabel} {rating.external}</span>}
            {rating.my === null ? null : <span className="block text-[#d7b56a]">My rating {rating.my}</span>}
          </p>
        )}
        {description.length === 0 ? null : <p className="text-xs text-(--ink-muted)">{description}</p>}
        {notes.length === 0 ? null : <p className="line-clamp-3 text-xs">{notes}</p>}
      </div>
    </motion.div>,
    document.body,
  )
}

export function HomePosterLink({ item, className = '' }: { item: MediaItem; className?: string }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | null>(null)
  const [box, setBox] = useState<{ top: number; left: number; right: number; bottom: number } | null>(null)
  const title = displayTitle(item.title, item.year)

  function clearTimer() {
    if (timer.current === null) return
    window.clearTimeout(timer.current)
    timer.current = null
  }

  function show() {
    if (!matches('(hover: hover) and (pointer: fine)')) return
    clearTimer()
    timer.current = window.setTimeout(() => {
      const rect = anchor.current?.getBoundingClientRect()
      if (rect === undefined) return
      setBox({ top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom })
    }, PREVIEW_DELAY)
  }

  function hide() {
    clearTimer()
    setBox(null)
  }

  useEffect(() => () => clearTimer(), [])

  return (
    <span ref={anchor} className={className} data-rail-card="true" onMouseEnter={show} onMouseLeave={hide}>
      <Link aria-label={title} className={`block ${cardHoverClass()}`} to={itemHref(item)}>
        <span className={`${CARD_POSTER} block overflow-hidden`}>
          <PosterImage alt="" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w185')} title={title} />
        </span>
      </Link>
      {box === null ? null : <PosterPreview anchor={box} item={item} />}
    </span>
  )
}
