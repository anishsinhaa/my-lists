import { PosterImage } from '@/components/common/PosterImage'
import { StatusChip } from '@/components/common/StatusChip'
import { displayTitle } from '@/lib/displayTitle'
import { LIST_KIND, TAB_NAME } from '@/types/lists'
import type { SearchHit } from '@/features/search/searchIndex'

export function SearchResultRow({ hit, active = false, onSelect, controlId }: { hit: SearchHit; active?: boolean; onSelect: () => void; controlId?: string }) {
  const item = hit.source.item
  const pick = hit.source.kind === 'pick'
  return (
    <button id={controlId} type="button" aria-selected={active} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-(--surface) ${active ? 'bg-(--surface)' : ''}`} onClick={onSelect}>
      <PosterImage alt="" className="w-10 shrink-0" kind={LIST_KIND[hit.listId]} src={item.poster} title={displayTitle(item.title, item.year)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{displayTitle(item.title, item.year)}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-(--ink-muted)">
          {item.year !== null ? <span>{item.year}</span> : null}
          <span className="rounded-full border border-border px-1.5 py-0.5">{TAB_NAME[hit.listId]}</span>
          {pick ? <span className="rounded-full bg-[#4c1d95] px-1.5 py-0.5 text-[#f5f3ff]">In picks</span> : null}
          <StatusChip size="sm" status={item.status} />
        </span>
      </span>
    </button>
  )
}
