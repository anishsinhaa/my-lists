import { CountUp } from '@/components/common/CountUp'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import type { SmartViewDef } from '../smart/smartViews'
import { PosterGrid } from './PosterGrid'

export function SplitView({ items, view, listId }: { items: MediaItem[]; view: SmartViewDef; listId: ListId }) {
  const split = view.split
  if (split === undefined) return <PosterGrid items={items} listId={listId} />
  const left = items.filter(split.left)
  const right = items.filter(split.right)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section>
        <h3 className="mb-2 text-sm">{split.leftLabel} <CountUp value={left.length} /></h3>
        <PosterGrid items={left} listId={listId} />
      </section>
      <section>
        <h3 className="mb-2 text-sm">{split.rightLabel} <CountUp value={right.length} /></h3>
        <PosterGrid items={right} listId={listId} />
      </section>
    </div>
  )
}
