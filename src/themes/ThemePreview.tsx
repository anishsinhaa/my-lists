import { CountUp } from '@/components/common/CountUp'
import { PosterImage } from '@/components/common/PosterImage'
import { StatusChip } from '@/components/common/StatusChip'
import { STATUSES } from '@/types/lists'
import type { ThemeId } from '@/types/theme'
import { THEME_SPECS } from './themeSpecs'

const SAMPLE_STATUSES = [...new Set([...STATUSES.movies, ...STATUSES.series, ...STATUSES.games, ''])]

const ids = Object.keys(THEME_SPECS) as ThemeId[]

export function ThemePreview() {
  return (
    <main className="space-y-4 p-4">
      {ids.map((id) => {
        const spec = THEME_SPECS[id]
        return (
          <section key={id} data-theme={id} className="rounded-(--radius) border p-4" style={{ background: spec.colors.bg, color: spec.colors.ink, borderColor: spec.colors.border, fontFamily: spec.fonts.body, borderRadius: spec.radiusPx }}>
            <h2 style={{ fontFamily: spec.fonts.display }}>{spec.label}</h2>
            <p style={{ color: spec.colors.inkMuted }}>{spec.cardStyle}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SAMPLE_STATUSES.map((status) => <StatusChip key={status || 'empty'} size="sm" status={status} />)}
            </div>
            <div className="mt-3 flex items-end gap-3">
              <PosterImage alt="" className="w-16" kind="movie" src="https://example.invalid/poster.jpg" title={spec.label} />
              <p className="text-2xl font-semibold"><CountUp value={128} /></p>
            </div>
          </section>
        )
      })}
    </main>
  )
}
