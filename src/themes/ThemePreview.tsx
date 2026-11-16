import type { ThemeId } from '@/types/theme'
import { THEME_SPECS } from './themeSpecs'

const ids = Object.keys(THEME_SPECS) as ThemeId[]

export function ThemePreview() {
  return (
    <main className="space-y-4 p-4">
      {ids.map((id) => {
        const spec = THEME_SPECS[id]
        return (
          <section key={id} data-theme={id} className="rounded-[var(--radius)] border p-4" style={{ background: spec.colors.bg, color: spec.colors.ink, borderColor: spec.colors.border, fontFamily: spec.fonts.body, borderRadius: spec.radiusPx }}>
            <h2 style={{ fontFamily: spec.fonts.display }}>{spec.label}</h2>
            <p style={{ color: spec.colors.inkMuted }}>{spec.cardStyle}</p>
            <div className="mt-2 h-8 w-24" style={{ background: spec.colors.accent, borderRadius: spec.radiusPx }} />
          </section>
        )
      })}
    </main>
  )
}
