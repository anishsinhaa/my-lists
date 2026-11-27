export const SHOW_AFTER_MS = 150
export const MIN_VISIBLE_MS = 300
export const FADE_MS = 200

export type BarPhase = 'hidden' | 'visible' | 'fading'

export interface BarTiming {
  startedAt: number | null
  shownAt: number | null
}

export function stepBar(state: BarTiming, loading: boolean, now: number): BarTiming & { phase: BarPhase } {
  let startedAt = state.startedAt
  let shownAt = state.shownAt
  if (shownAt === null && startedAt !== null && now - startedAt >= SHOW_AFTER_MS) {
    shownAt = startedAt + SHOW_AFTER_MS
    startedAt = null
  }
  if (loading && shownAt === null && startedAt === null) startedAt = now
  if (!loading && shownAt === null) return { phase: 'hidden', startedAt: null, shownAt: null }
  if (shownAt === null) return { phase: 'hidden', startedAt, shownAt }
  const age = now - shownAt
  if (loading || age < MIN_VISIBLE_MS) return { phase: 'visible', startedAt: null, shownAt }
  if (age < MIN_VISIBLE_MS + FADE_MS) return { phase: 'fading', startedAt: null, shownAt }
  return { phase: 'hidden', startedAt: null, shownAt: null }
}
