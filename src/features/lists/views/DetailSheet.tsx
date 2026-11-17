import { RatingBadge } from '@/components/common/RatingBadge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { externalRatingLabel } from '@/lib/rating'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'

function line(label: string, value: string | number | null) {
  return <p className="text-sm"><span className="text-[var(--ink-muted)]">{label}: </span>{value ?? '–'}</p>
}

export function DetailSheet({ item, listId, onClose }: { item: MediaItem | null; listId: ListId; onClose: () => void }) {
  const label = externalRatingLabel(listId)
  return (
    <Sheet open={item !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
        {item === null ? null : (
          <SheetHeader>
            <SheetTitle>{item.title}</SheetTitle>
            {line('Year', item.year)}
            {line('Genres', item.genres.join(', ') || null)}
            {line('Why', item.why || null)}
            {line('Creator', item.creator)}
            {line('Franchise', item.franchise)}
            {line('Status', item.status || null)}
            {line('Updated', item.updatedAt)}
            {listId === 'games' ? line('Platform', item.platform) : null}
            <p className="text-sm">My rating {item.myRating ?? '–'}</p>
            <p className="text-sm text-[var(--ink-muted)]">{label} {item.imdbRating ?? '–'}</p>
            <RatingBadge externalLabel={label} externalRating={item.imdbRating} myRating={item.myRating} size="md" />
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}
