import { normalizeTitle } from '../../src/lib/normalize.js'
import type { PosterLookup } from './types.js'

export const MIN_CONFIDENCE = 0.6

export function scoreMatch(wanted: PosterLookup, candidate: { title: string; year: number | null }): number {
  const left = normalizeTitle(wanted.title)
  const right = normalizeTitle(candidate.title)
  let score = 0
  if (left.length > 0 && left === right) score = 0.7
  else if (left.length > 0 && (right.includes(left) || left.includes(right))) score = 0.45
  else return 0
  if (wanted.year !== null && candidate.year !== null) {
    const diff = Math.abs(wanted.year - candidate.year)
    if (diff === 0) score += 0.3
    else if (diff === 1) score += 0.15
    else score -= 0.3
  }
  return Math.max(0, Math.min(1, score))
}

export function bestMatch<T extends { title: string; year: number | null }>(wanted: PosterLookup, candidates: T[]): { item: T; confidence: number } | null {
  let best: { item: T; confidence: number } | null = null
  for (const item of candidates) {
    const confidence = scoreMatch(wanted, item)
    if (best === null || confidence > best.confidence) best = { item, confidence }
  }
  if (best === null || best.confidence < MIN_CONFIDENCE) return null
  return best
}
