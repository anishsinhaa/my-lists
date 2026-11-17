import type { ListsPayload } from '@/types/media'
import { readJson, writeJson } from '@/lib/storage'

const KEY = 'ml.lists.v1'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

interface StoredLists {
  savedAt: string
  payload: ListsPayload
}

function isPayload(value: unknown): value is ListsPayload {
  return typeof value === 'object' && value !== null && 'lists' in value && 'picks' in value && 'dataHash' in value
}

export const listsCache = {
  load(): ListsPayload | null {
    const stored = readJson<StoredLists | null>(KEY, null)
    if (stored === null || typeof stored.savedAt !== 'string' || !isPayload(stored.payload)) return null
    if (Date.now() - Date.parse(stored.savedAt) > MAX_AGE_MS) return null
    return stored.payload
  },
  save(payload: ListsPayload): void {
    writeJson(KEY, { savedAt: new Date().toISOString(), payload } satisfies StoredLists)
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Private-mode storage. The next fetch still replaces the in-memory query.
    }
  },
}
