import type { MediaKind } from '@/types/lists'

const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['var(--bg)', 'var(--accent)'],
  ['var(--surface-2)', 'var(--accent-2)'],
  ['var(--accent)', 'var(--bg)'],
  ['var(--accent-2)', 'var(--surface)'],
  ['var(--surface)', 'var(--brass)'],
  ['var(--brass)', 'var(--bg)'],
  ['var(--ink)', 'var(--accent)'],
  ['var(--accent)', 'var(--accent-2)'],
]

function coverPaletteIndex(title: string): number {
  let hash = 2166136261
  for (let index = 0; index < title.length; index += 1) {
    hash ^= title.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % PAIRS.length
}

function titleSize(title: string): string {
  if (title.length > 48) return 'text-sm'
  if (title.length > 28) return 'text-base'
  if (title.length > 16) return 'text-lg'
  return 'text-xl'
}

export function FallbackCover({ title, byline = '', kind = 'other', className = '' }: { title: string; byline?: string; kind?: MediaKind; className?: string }) {
  const palette = coverPaletteIndex(title)
  const pair = PAIRS[palette] ?? PAIRS[0]
  const from = pair?.[0] ?? 'var(--bg)'
  const to = pair?.[1] ?? 'var(--accent)'
  return (
    <div
      data-palette={palette}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden px-4 text-center text-(--ink) ${className}`}
      style={{ backgroundImage: `linear-gradient(165deg, ${from}, ${to})` }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-2 border border-(--ink)/35" />
      {kind === 'book' ? <span aria-hidden="true" data-spine="true" className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-(--ink)/20" /> : null}
      <span className="relative z-10 flex w-full max-w-full flex-col items-center">
        <span className={`line-clamp-4 font-(--font-display) font-bold leading-tight text-balance ${titleSize(title)}`}>{title}</span>
        {byline.length === 0 ? null : (
          <>
            <span aria-hidden="true" className="my-2 h-px w-8 bg-(--ink)/45" />
            <span className="line-clamp-2 text-xs">{byline}</span>
          </>
        )}
      </span>
    </div>
  )
}
