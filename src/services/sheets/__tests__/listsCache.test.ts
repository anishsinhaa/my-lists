import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LIST_IDS, PICKS_IDS } from '@/types/lists'
import type { ListsPayload } from '@/types/media'
import { listsCache } from '../listsCache'

function payload(dataHash = 'hash-1'): ListsPayload {
  const lists = Object.fromEntries(LIST_IDS.map((id) => [id, []])) as unknown as ListsPayload['lists']
  const picks = Object.fromEntries(PICKS_IDS.map((id) => [id, []])) as unknown as ListsPayload['picks']
  const columns = Object.fromEntries([...LIST_IDS, ...PICKS_IDS].map((id) => [id, { poster: true, creator: true, franchise: true, imdbRating: true }])) as ListsPayload['columns']
  return { fetchedAt: '2026-01-01T00:00:00.000Z', dataHash, lists, picks, warnings: [], columns }
}

function seed(userId: string, dataHash = 'hash-1', savedAt = new Date().toISOString()) {
  const body = payload(dataHash)
  localStorage.setItem('ml.lists.v2', JSON.stringify({ savedAt, userId, dataHash, payload: body }))
  return body
}

async function flushWrites() {
  await new Promise((resolve) => setTimeout(resolve, 0))
  if (typeof requestIdleCallback === 'function') {
    await new Promise((resolve) => requestIdleCallback(() => resolve(undefined)))
  }
}

beforeEach(() => {
  localStorage.clear()
  listsCache.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  listsCache.clear()
})

describe('listsCache', () => {
  it('parses storage once, drops v1, and hides another user', () => {
    localStorage.setItem('ml.lists.v1', '{"savedAt":"x"}')
    seed('user-1')
    const parse = vi.spyOn(JSON, 'parse')
    expect(listsCache.load('user-1')?.dataHash).toBe('hash-1')
    expect(listsCache.load('user-1')?.dataHash).toBe('hash-1')
    expect(listsCache.load('user-1')?.dataHash).toBe('hash-1')
    expect(listsCache.load('user-1')?.dataHash).toBe('hash-1')
    expect(listsCache.load('user-1')?.dataHash).toBe('hash-1')
    expect(parse).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('ml.lists.v1')).toBeNull()
    expect(listsCache.load('user-2')).toBeNull()
    expect(parse).toHaveBeenCalledTimes(1)
  })

  it('skips a write when the hash and user already match', async () => {
    const body = seed('user-1')
    listsCache.load('user-1')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    listsCache.save(body, 'user-1')
    await flushWrites()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('reads storage again after clear', () => {
    seed('user-1')
    expect(listsCache.load('user-1')?.dataHash).toBe('hash-1')
    listsCache.clear()
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    expect(listsCache.load('user-1')).toBeNull()
    expect(getItem).toHaveBeenCalled()
  })
})
