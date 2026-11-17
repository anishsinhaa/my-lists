import { useNavigate } from 'react-router-dom'
import { PosterImage } from '@/components/common/PosterImage'
import { StatusChip } from '@/components/common/StatusChip'
import { LIST_KIND, TAB_NAME } from '@/types/lists'
import type { SearchHit } from '@/features/search/searchIndex'

export function SearchResultRow({ hit }: { hit: SearchHit }) {
  const navigate = useNavigate()
  const item = hit.source.item
  const pick = hit.source.kind === 'pick'
  const onSelect = () => {
    if (pick && hit.source.kind === 'pick') {
      navigate(`/picks?tab=${hit.source.item.picksId}&q=${encodeURIComponent(item.title)}`)
      return
    }
    navigate(`/lists/${hit.listId}?q=${encodeURIComponent(item.title)}`)
  }
  return (
    <button type="button" className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-(--surface)" onClick={onSelect}>
      <PosterImage alt="" className="w-10 shrink-0" kind={LIST_KIND[hit.listId]} src={item.poster} title={item.title} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.title}</span>
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
