import type { MediaKind } from '@/types/lists'

export const COVER_LIGHT = '#fdf8f0'
export const COVER_DARK = '#1c1612'

export const COVER_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['#f4ebdd', '#e7d3b5'],
  ['#fbf6ec', '#d5c4a1'],
  ['#fff8ee', '#e4d2b0'],
  ['#f7f1e4', '#cfc3a4'],
  ['#2e2a25', '#5c4033'],
  ['#3a2a22', '#6b4428'],
  ['#1c1916', '#4a382c'],
  ['#24302c', '#3e5248'],
]

function channel(hex: string, index: number): number {
  const value = Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2)
}

export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function mixHex(from: string, to: string): string {
  const bytes = [0, 1, 2].map((index) => {
    const left = Number.parseInt(from.slice(1 + index * 2, 3 + index * 2), 16)
    const right = Number.parseInt(to.slice(1 + index * 2, 3 + index * 2), 16)
    return Math.round((left + right) / 2).toString(16).padStart(2, '0')
  })
  return `#${bytes.join('')}`
}

export function coverTextColor(from: string, to: string): string {
  const grounds = [from, to, mixHex(from, to)]
  const light = Math.min(...grounds.map((ground) => contrastRatio(COVER_LIGHT, ground)))
  const dark = Math.min(...grounds.map((ground) => contrastRatio(COVER_DARK, ground)))
  return light >= dark ? COVER_LIGHT : COVER_DARK
}

function coverPaletteIndex(title: string): number {
  let hash = 2166136261
  for (let index = 0; index < title.length; index += 1) {
    hash ^= title.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % COVER_PAIRS.length
}

function titleSize(title: string): string {
  if (title.length > 48) return 'text-sm'
  if (title.length > 28) return 'text-base'
  if (title.length > 16) return 'text-lg'
  return 'text-xl'
}

export function FallbackCover({ title, byline = '', kind = 'other', className = '' }: { title: string; byline?: string; kind?: MediaKind; className?: string }) {
  const palette = coverPaletteIndex(title)
  const pair = COVER_PAIRS[palette] ?? COVER_PAIRS[0]
  const from = pair?.[0] ?? COVER_PAIRS[0][0]
  const to = pair?.[1] ?? COVER_PAIRS[0][1]
  const ink = coverTextColor(from, to)
  return (
    <div
      data-palette={palette}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden px-4 text-center ${className}`}
      style={{ backgroundImage: `linear-gradient(165deg, ${from}, ${to})`, color: ink, textShadow: ink === COVER_LIGHT ? '0 1px 2px rgb(0 0 0 / 0.45)' : undefined }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-2 border border-current/35" />
      {kind === 'book' ? <span aria-hidden="true" data-spine="true" className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-current/20" /> : null}
      <span className="relative z-10 flex w-full max-w-full flex-col items-center">
        <span className={`line-clamp-4 font-(--font-display) font-bold leading-tight text-balance ${titleSize(title)}`}>{title}</span>
        {byline.length === 0 ? null : (
          <>
            <span aria-hidden="true" className="my-2 h-px w-8 bg-current/45" />
            <span className="line-clamp-2 text-xs">{byline}</span>
          </>
        )}
      </span>
    </div>
  )
}
