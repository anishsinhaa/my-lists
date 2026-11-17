export function RatingBadge({ myRating, externalRating, externalLabel, size = 'sm' }: { myRating: number | null; externalRating: number | null; externalLabel: string; size?: 'sm' | 'md' }) {
  if (myRating === null && externalRating === null) return null
  const text = size === 'md' ? 'text-sm' : 'text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 ${text}`}>
      {myRating !== null ? <span className="text-accent">★ {myRating}</span> : null}
      {externalRating !== null ? <span className="text-(--ink-muted)">{externalLabel} {externalRating}</span> : null}
    </span>
  )
}
