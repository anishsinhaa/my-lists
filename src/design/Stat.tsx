import { CountUp } from '@/components/common/CountUp'

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <p className="min-w-16">
      <span className="block font-['Cinzel',serif] text-2xl tabular-nums">{typeof value === 'number' ? <CountUp value={value} /> : value}</span>
      <span className="text-xs tracking-wide text-(--ink-muted) uppercase">{label}</span>
    </p>
  )
}

export function SegmentedBar({ segments, onSelect }: { segments: { id: string; label: string; count: number; tone?: string }[]; onSelect?: (id: string) => void }) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0)
  if (total === 0) return null
  return (
    <div className="flex h-3 overflow-hidden rounded-full border border-(--brass)/40" role="group" aria-label="Status mix">
      {segments.filter((segment) => segment.count > 0).map((segment) => (
        <button key={segment.id} type="button" aria-label={`${segment.label}: ${segment.count}`} title={`${segment.label}: ${segment.count}`} className={`h-full min-w-px ${segment.tone ?? 'bg-accent'}`} style={{ width: `${(segment.count / total) * 100}%` }} onClick={() => onSelect?.(segment.id)} />
      ))}
    </div>
  )
}

export function Ribbon({ children }: { children: string }) {
  return <span className="inline-block bg-accent px-2 py-1 text-xs text-(--bg) shadow-md">{children}</span>
}
