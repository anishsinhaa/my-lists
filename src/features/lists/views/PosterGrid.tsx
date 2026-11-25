import { useState } from 'react'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { useInfiniteChunks } from '@/hooks/useInfiniteChunks'
import { useCanEdit } from '@/features/auth/AuthContext'
import { useSaveItem } from '../useSaveItem'
import { ItemModal } from './ItemModal'
import { PosterCard } from './PosterCard'

export function PosterGrid({ items, listId }: { items: MediaItem[]; listId: ListId }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const canEdit = useCanEdit()
  const save = useSaveItem()
  const open = openId === null ? null : items.find((item) => item.id === openId) ?? null
  const { visible, sentinelRef, hasMore } = useInfiniteChunks(items)
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visible.map((item, index) => <PosterCard key={item.id} index={index} item={item} onOpen={(entry) => setOpenId(entry.id)} />)}
      </div>
      {hasMore ? <div ref={sentinelRef} className="h-8" /> : null}
      <ItemModal item={open} items={items} listId={listId} readOnly={!canEdit} onClose={() => setOpenId(null)} onOpen={(entry) => setOpenId(entry.id)} onSave={save} />
    </>
  )
}
