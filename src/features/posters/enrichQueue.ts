import { normalizeTitle } from '@/lib/normalize'
import { fillPosters } from '@/services/images/posterApi'
import type { PosterFillItem, PosterFillResult } from '@/types/api'

const BATCH = 4
const waiting: PosterFillItem[] = []
const inflight = new Map<string, PosterFillItem>()
const settled = new Set<string>()
const counters = new Map<string, { done: number; failed: number }>()
const resultHandlers = new Set<(result: PosterFillResult, item: PosterFillItem) => void>()
const statHandlers = new Set<() => void>()
let working = false
let omdbDown = false

function keyOf(item: PosterFillItem): string {
  return `${item.tab}:${normalizeTitle(item.title)}:${item.year ?? ''}`
}

function ratingOnly(item: PosterFillItem): boolean {
  return item.needs.length > 0 && item.needs.every((field) => field === 'imdbRating')
}

function usesOmdb(tab: string): boolean {
  return tab === 'movies' || tab === 'series' || tab === 'anime'
}

function emitStats(): void {
  for (const handler of statHandlers) handler()
}

function dropIdleRatings(): void {
  for (let index = waiting.length - 1; index >= 0; index -= 1) {
    const item = waiting[index]
    if (item === undefined || !ratingOnly(item) || !usesOmdb(item.tab)) continue
    waiting.splice(index, 1)
    settled.add(keyOf(item))
  }
}

export function enqueueFills(items: PosterFillItem[]): void {
  for (const item of items) {
    if (omdbDown && ratingOnly(item) && usesOmdb(item.tab)) continue
    const key = keyOf(item)
    if (settled.has(key) || inflight.has(key) || waiting.some((queued) => keyOf(queued) === key)) continue
    waiting.push(item)
  }
  pump()
}

export function onEnrichResult(handler: (result: PosterFillResult, item: PosterFillItem) => void): () => void {
  resultHandlers.add(handler)
  return () => resultHandlers.delete(handler)
}

export function onEnrichStats(handler: () => void): () => void {
  statHandlers.add(handler)
  return () => statHandlers.delete(handler)
}

export function enrichStats(tab: string): { pending: number; done: number; running: boolean; failed: number } {
  const pending = waiting.filter((item) => item.tab === tab).length + [...inflight.values()].filter((item) => item.tab === tab).length
  const counts = counters.get(tab) ?? { done: 0, failed: 0 }
  return { pending, done: counts.done, running: pending > 0, failed: counts.failed }
}

export function resetEnrichQueue(): void {
  waiting.splice(0, waiting.length)
  inflight.clear()
  settled.clear()
  counters.clear()
  resultHandlers.clear()
  statHandlers.clear()
  working = false
  omdbDown = false
}

export function enrichIdle(): Promise<void> {
  if (!working && waiting.length === 0 && inflight.size === 0) return Promise.resolve()
  return new Promise((resolve) => {
    const check = (): void => {
      if (working || waiting.length !== 0 || inflight.size !== 0) return
      statHandlers.delete(check)
      resolve()
    }
    statHandlers.add(check)
    check()
  })
}

function pump(): void {
  if (working) return
  working = true
  void drain()
}

function takeBatch(): PosterFillItem[] {
  const batch: PosterFillItem[] = []
  while (batch.length < BATCH && waiting.length > 0) {
    const item = waiting.shift()
    if (item === undefined) break
    const key = keyOf(item)
    if (omdbDown && ratingOnly(item) && usesOmdb(item.tab)) {
      settled.add(key)
      continue
    }
    if (settled.has(key) || inflight.has(key)) continue
    inflight.set(key, item)
    batch.push(item)
  }
  return batch
}

async function requestBatch(items: PosterFillItem[]): Promise<PosterFillResult[] | undefined> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fillPosters(items)
    } catch {
      if (attempt === 0) continue
    }
  }
  return undefined
}

async function drain(): Promise<void> {
  try {
    while (waiting.length > 0 || inflight.size > 0) {
      const batch = takeBatch()
      if (batch.length === 0) break
      emitStats()
      let results = await requestBatch(batch)
      if (results !== undefined) {
        const retry = batch.filter((_, index) => results?.[index]?.outcome === 'provider_error')
        if (retry.length > 0) {
          const again = await requestBatch(retry)
          if (again !== undefined) {
            retry.forEach((item, index) => {
              const slot = batch.indexOf(item)
              const next = again[index]
              if (slot >= 0 && next !== undefined) results![slot] = next
            })
          }
        }
      }
      for (let index = 0; index < batch.length; index += 1) {
        const item = batch[index]
        if (item === undefined) continue
        const result = results?.[index]
        inflight.delete(keyOf(item))
        settled.add(keyOf(item))
        const counts = counters.get(item.tab) ?? { done: 0, failed: 0 }
        counts.done += 1
        if (result === undefined || result.outcome === 'provider_error') counts.failed += 1
        counters.set(item.tab, counts)
        if (result?.detail === 'no_omdb_key') {
          omdbDown = true
          dropIdleRatings()
        }
        if (result !== undefined) {
          for (const handler of resultHandlers) handler(result, item)
        }
      }
      emitStats()
    }
  } finally {
    working = false
    emitStats()
    if (waiting.length > 0) pump()
  }
}
