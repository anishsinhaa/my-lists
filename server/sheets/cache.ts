import type { ListsPayload } from '../../src/types/media.js'

let cached: { at: number; data: ListsPayload } | undefined
let inflight: Promise<ListsPayload> | undefined
let lastForce = 0

export function resetListsCache(): void {
  cached = undefined
  inflight = undefined
  lastForce = 0
}

export function getCachedLists(loader: () => Promise<ListsPayload>, options: { ttlMs: number; force: boolean }): Promise<ListsPayload> {
  const now = Date.now()
  if (!options.force && cached !== undefined && now - cached.at < options.ttlMs) return Promise.resolve(cached.data)
  if (options.force && cached !== undefined && now - lastForce < 5000) return Promise.resolve(cached.data)
  if (inflight !== undefined) return inflight
  if (options.force) lastForce = now
  inflight = loader()
    .then((data) => {
      cached = { at: Date.now(), data }
      return data
    })
    .finally(() => {
      inflight = undefined
    })
  return inflight
}
