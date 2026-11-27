import { StatusBadge } from '@/design/StatusBadge'
import { displayTitle } from '@/lib/displayTitle'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'

function extra(item: MediaItem, key: string): string {
  return (item.extra[key] ?? '').trim()
}

export function NoteCard({ item, listId, onOpen }: {
  item: MediaItem
  listId: Extract<ListId, 'other' | 'curious'>
  onOpen: (item: MediaItem) => void
}) {
  const what = extra(item, 'what it is')
  const type = extra(item, 'type')
  const source = extra(item, 'source')
  return (
    <button type="button" className={`rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-left ${listId === 'other' ? 'other-row' : 'curious-row'}`} onClick={() => onOpen(item)}>
      <span className="block font-(--font-display) text-lg">{displayTitle(item.title, item.year)}</span>
      {what.length > 0 ? <span className="mt-1 line-clamp-3 block text-sm text-(--ink-muted)">{what}</span> : null}
      <span className="mt-2 flex flex-wrap items-center gap-1.5">
        {type.length > 0 ? <span className="rounded-full border border-(--border) px-2 py-0.5 text-xs">{type}</span> : null}
        {source.length > 0 ? <span className="rounded-full border border-(--border) px-2 py-0.5 text-xs">{source}</span> : null}
        {item.status.trim().length > 0 ? <StatusBadge listId={listId} size="sm" status={item.status} /> : null}
      </span>
    </button>
  )
}
