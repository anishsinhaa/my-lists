import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { PosterImage } from '@/components/common/PosterImage'
import { StatusChip } from '@/components/common/StatusChip'
import { thumbnailUrl, visibleRating } from '@/design/archive'
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
      className="pointer-events-none fixed z-[80] overflow-hidden rounded-md border border-(--brass)/50 bg-[#17130f] text-[#f4ead8] shadow-[0_12px_24px_#00000088]"
      style={{ top: place.top, left: place.left, width: PREVIEW_WIDTH }}
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.16 }}
    >
      <div className="flex items-start gap-2 p-1.5">
        <span className="w-10 shrink-0">
          <PosterImage alt="" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w185')} title={displayTitle(item.title, item.year)} />
        </span>
        <div className="min-w-0 space-y-0.5 py-0.5">
          <p className="truncate font-['Cinzel',serif] text-[11px] leading-tight">{displayTitle(item.title, item.year)}</p>
          <p className="truncate text-[10px] text-(--ink-muted)">{item.year ?? 'Year unknown'} · {TAB_NAME[item.listId]}</p>
          {item.status.trim().length === 0 ? null : <StatusChip size="sm" status={item.status} />}
          {item.genres.length === 0 ? null : <p className="truncate text-[10px] text-(--ink-muted)">{item.genres.slice(0, 3).join(' · ')}</p>}
          {rating.my === null && rating.external === null ? null : (
            <p className="truncate text-[10px] leading-tight">
              {rating.external === null ? null : <span className="text-(--ink-muted)">{rating.externalLabel} {rating.external}</span>}
              {rating.my === null || rating.external === null ? null : <span className="text-(--ink-muted)"> · </span>}
              {rating.my === null ? null : <span className="text-[#d7b56a]">My rating {rating.my}</span>}
            </p>
          )}
          {description.length === 0 ? null : <p className="truncate text-[10px] text-(--ink-muted)">{description}</p>}
          {notes.length === 0 ? null : <p className="truncate text-[10px]">{firstLine(notes)}</p>}
        </div>
      </div>
    </motion.div>,
    document.body,
  )
}

export function HomePosterLink({ item, href, className = '' }: { item: MediaItem; href: string; className?: string }) {
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
      <Link aria-label={title} className="block" to={href}>
        <PosterImage alt="" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w185')} title={title} />
      </Link>
      {box === null ? null : <PosterPreview anchor={box} item={item} />}
    </span>
  )
}
