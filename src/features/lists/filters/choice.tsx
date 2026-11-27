import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { ListId } from '@/types/lists'

const SHAPE: Record<ListId, string> = {
  movies: 'rounded-[2px_14px_2px_14px] border-dashed',
  series: 'rounded-md font-(--font-body)',
  anime: 'rounded-md border-[3px] shadow-[3px_3px_0_#1b1b3a]',
  games: "rounded-sm font-['Rajdhani',sans-serif] tracking-wider uppercase",
  books: 'rounded-sm border-l-4',
  other: 'rounded-md',
  curious: 'rounded-md',
}

const EDGE: Record<ListId, string> = {
  movies: 'border-[#d4af37]',
  series: 'border-[#6e8f8a]',
  anime: 'border-[#1b1b3a]',
  games: 'border-[#00f0ff]',
  books: 'border-[#8c5a3c]',
  other: 'border-[#5eead4]/40',
  curious: 'border-[#b08d57]/50',
}

function chipClass(listId: ListId, pressed: boolean, slim = false): string {
  const height = slim ? 'min-h-8 px-2 text-xs' : 'min-h-11 px-3 text-sm'
  const state = pressed ? 'border-transparent bg-accent text-(--bg)' : `bg-(--surface) text-(--ink) ${EDGE[listId]}`
  return `inline-flex shrink-0 items-center gap-1.5 border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brass) ${height} ${SHAPE[listId]} ${state}`
}

export function Choice({ listId, pressed, onClick, children, count, icon, slim = false }: {
  listId: ListId
  pressed: boolean
  onClick: () => void
  children: string
  count?: number
  icon?: ReactNode
  slim?: boolean
}) {
  return (
    <button type="button" aria-pressed={pressed} aria-label={count === undefined ? children : `${children} ${count}`} onClick={onClick} className={chipClass(listId, pressed, slim)}>
      {pressed ? <Check aria-hidden="true" className="size-3.5 shrink-0" /> : null}
      {icon}
      <span>{children}</span>
      {count === undefined || slim ? null : <span className="tabular-nums">{count}</span>}
    </button>
  )
}
