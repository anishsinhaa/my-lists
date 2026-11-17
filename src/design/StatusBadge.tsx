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

export function StatusBadge({ listId, status }: { listId: ListId; status: string }) {
  const matched = matchStatus(listId, status)
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[11px] leading-none backdrop-blur-sm ${FAMILY[matched.family]}`}>
      {matched.family === 'active' ? <span className="size-1.5 animate-pulse rounded-full bg-amber-300 motion-reduce:animate-none" /> : <StatusGlyph name={matched.icon} />}
      <span className="truncate">{matched.value}</span>
    </span>
  )
}
