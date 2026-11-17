import type { ListId } from '@/types/lists'
import { matchStatus, type StatusFamily } from './statusConfig'
import { StatusGlyph } from './icons'

const FAMILY: Record<StatusFamily, string> = {
  active: 'border-amber-200/70 bg-[#3a2a12]/90 text-amber-100',
  queue: 'border-(--brass)/70 bg-[#1c1814]/90 text-[#f3e6c8]',
  done: 'border-emerald-200/50 bg-[#10241a]/90 text-emerald-100',
  parked: 'border-zinc-300/40 bg-[#222]/90 text-zinc-100',
  dropped: 'border-red-200/40 bg-[#2a1212]/90 text-red-100',
  none: 'border-white/30 bg-black/70 text-white',
}

function seriesTone(status: string): string | null {
  const key = status.trim().toLowerCase()
  if (key === 'in progress') return 'border-[#f4b860]/80 bg-[#3a2a12]/90 text-[#f4b860]'
  if (key === 'next season out') return 'border-[#e4572e]/80 bg-[#3a1a12]/90 text-[#ffd0c2]'
  if (key === 'watched') return 'border-[#7fb685]/80 bg-[#143026]/90 text-[#d5f0da]'
  if (key === 'dropped') return 'border-[#8a9694]/70 bg-[#1c2424]/90 text-[#d5dedc]'
  return null
}

export function StatusBadge({ listId, status }: { listId: ListId; status: string }) {
  const matched = matchStatus(listId, status)
  const tone = listId === 'series' ? seriesTone(matched.value) ?? FAMILY[matched.family] : FAMILY[matched.family]
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[11px] leading-none backdrop-blur-sm ${tone}`}>
      {matched.family === 'active' ? <span className="size-1.5 animate-pulse rounded-full bg-amber-300 motion-reduce:animate-none" /> : <StatusGlyph name={matched.icon} />}
      <span className="truncate">{matched.value}</span>
    </span>
  )
}
