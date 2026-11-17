import { statusGroupOf, type StatusGroup } from '@/types/lists'

const GROUP_CLASS: Record<StatusGroup, string> = {
  done: 'bg-[#14532d] text-[#dcfce7]',
  active: 'border border-accent bg-[color-mix(in_srgb,var(--accent)_28%,var(--surface))] text-(--ink)',
  planned: 'bg-[#1e3a8a] text-[#dbeafe]',
  maybe: 'bg-[#3f3f46] text-[#fafafa]',
  unknown: 'bg-[#3f3f46] text-[#fafafa]',
  waiting: 'bg-[#92400e] text-[#fef3c7]',
  paused: 'bg-[#334155] text-[#f1f5f9]',
  dropped: 'bg-[#991b1b] text-[#fee2e2]',
}

export function StatusChip({ status, group, size = 'md' }: { status: string; group?: StatusGroup; size?: 'sm' | 'md' }) {
  const label = status.trim().length === 0 ? 'No status' : status.trim()
  const resolved = group ?? statusGroupOf(label === 'No status' ? '' : label)
  const sizing = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
  return <span className={`inline-flex max-w-full items-center rounded-full font-medium ${sizing} ${GROUP_CLASS[resolved]}`}>{label}</span>
}
