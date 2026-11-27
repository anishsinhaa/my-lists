import type { ListsPayload } from '@/types/media'
import { readJson, writeJson } from '@/lib/storage'

const KEY = 'ml.lists.v2'
const LEGACY_KEY = 'ml.lists.v1'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

interface StoredLists {
  savedAt: string
  userId: string
  dataHash: string
  payload: ListsPayload
}

let memory: StoredLists | null | undefined
let writeEpoch = 0
let writeScheduled = false

function isPayload(value: unknown): value is ListsPayload {
  return typeof value === 'object' && value !== null && 'lists' in value && 'picks' in value && 'dataHash' in value
}

function isStored(value: unknown): value is StoredLists {
  if (typeof value !== 'object' || value === null) return false
  const stored = value as Partial<StoredLists>
  return typeof stored.savedAt === 'string'
    && typeof stored.userId === 'string'
    && typeof stored.dataHash === 'string'
    && isPayload(stored.payload)
}

function readStored(): StoredLists | null {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // Private mode. The in-memory copy still works for this tab.
  }
  const stored = readJson<unknown>(KEY, null)
  if (!isStored(stored)) return null
  if (Date.now() - Date.parse(stored.savedAt) > MAX_AGE_MS) {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // Quota or private mode.
    }
    return null
  }
  return stored
}

function persist(): void {
  if (memory === undefined || memory === null) return
  writeJson(KEY, memory)
}

function scheduleWrite(): void {
  if (writeScheduled) return
  writeScheduled = true
  const epoch = writeEpoch
  const run = () => {
    writeScheduled = false
    if (epoch !== writeEpoch) return
    persist()
  }
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run)
  else setTimeout(run, 0)
}

export const listsCache = {
  load(userId: string): ListsPayload | null {
    if (memory === undefined) memory = readStored()
    if (memory === null || memory.userId !== userId) return null
    return memory.payload
  },
  savedAt(): number | null {
    if (memory === undefined || memory === null) return null
    const time = Date.parse(memory.savedAt)
    return Number.isNaN(time) ? null : time
  },
  save(payload: ListsPayload, userId = ''): void {
    const id = userId.length > 0 ? userId : (memory !== undefined && memory !== null ? memory.userId : '')
    if (id.length === 0) return
    if (memory !== undefined && memory !== null && memory.dataHash === payload.dataHash && memory.userId === id) return
    memory = { savedAt: new Date().toISOString(), userId: id, dataHash: payload.dataHash, payload }
    scheduleWrite()
  },
  clear(): void {
    writeEpoch += 1
    writeScheduled = false
    memory = undefined
    try {
      localStorage.removeItem(KEY)
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      // Private-mode storage. The next fetch still replaces the in-memory query.
    }
  },
}
