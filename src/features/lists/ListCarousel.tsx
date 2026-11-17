import { useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { ListCategoryCard, postersFor, type CardListId } from './ListCategoryCard'

const ORDER: CardListId[] = ['movies', 'series', 'anime', 'games', 'books']

export function ListCarousel({ counts, lists }: { counts: Record<ListId, number>; lists: Record<ListId, MediaItem[]> }) {
  const [ref, api] = useEmblaCarousel({ align: 'center', containScroll: false })
  const [selected, setSelected] = useState(0)
  useEffect(() => {
    if (api === undefined) return
    const update = () => setSelected(api.selectedScrollSnap())
    api.on('select', update)
    update()
    return () => { api.off('select', update) }
  }, [api])
  return (
    <div className="overflow-hidden touch-pan-y" ref={ref}>
      <div className="flex">
        {ORDER.map((id) => (
          <div key={id} className="min-w-0 shrink-0 grow-0 basis-full px-3">
            <ListCategoryCard count={counts[id]} items={lists[id]} listId={id} posters={postersFor(lists[id])} to={`/lists/${id}`} variant="fullscreen" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {ORDER.map((id, index) => <button key={id} type="button" aria-label={id} className={`h-2 w-2 rounded-full ${index === selected ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} onClick={() => api?.scrollTo(index)} />)}
      </div>
    </div>
  )
}
