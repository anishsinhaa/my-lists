import { formatRating } from '@/lib/rating'

export function RatingBadge({ myRating, externalRating, externalLabel, size = 'sm' }: { myRating: number | null; externalRating: number | null; externalLabel: string; size?: 'sm' | 'md' }) {
  if (myRating === null && externalRating === null) return null
  const text = size === 'md' ? 'text-sm' : 'text-xs'
  return (
    <span className={`inline-flex flex-col items-start leading-tight ${text}`}>
      {externalRating !== null ? <span className="text-(--ink-muted)">{externalLabel} {formatRating(externalRating)}</span> : null}
      {myRating !== null ? <span className="text-accent">My rating {formatRating(myRating)}</span> : null}
    </span>
  )
}
