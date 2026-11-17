import { useState } from 'react'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { useInfiniteChunks } from '@/hooks/useInfiniteChunks'
import { DetailSheet } from './DetailSheet'
import { PosterCard } from './PosterCard'

export function PosterGrid({ items, listId }: { items: MediaItem[]; listId: ListId }) {
  const [open, setOpen] = useState<MediaItem | null>(null)
  const { visible, sentinelRef, hasMore } = useInfiniteChunks(items)
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visible.map((item, index) => <PosterCard key={item.id} index={index} item={item} onOpen={setOpen} />)}
      </div>
      {hasMore ? <div ref={sentinelRef} className="h-8" /> : null}
      <DetailSheet item={open} listId={listId} onClose={() => setOpen(null)} />
    </>
  )
}
