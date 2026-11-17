import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { LIST_IDS, PICKS_IDS, TAB_NAME } from '../../../src/types/lists.js'
import { getCachedLists, resetListsCache } from '../cache.js'
import { readAll } from '../readAll.js'
import type { SheetsClient } from '../client.js'
import { movieRows } from '../../../src/test/fixtures/sheetValues.js'

function clientReturning(present: string[]): SheetsClient {
  return {
    async batchGetValues(ranges) {
      return ranges.filter((range) => present.some((name) => range.includes(name))).map((range) => ({ range, values: range.includes('Movies') && !range.includes('picks') ? movieRows : [['Title'], ['Sample']] }))
    },
    async batchUpdateValues() {
      throw new Error('read path must not write')
    },
  }
}

describe('readAll', () => {
  it('reads every tab in one batch and warns when a tab is missing', async () => {
    const names = [...LIST_IDS, ...PICKS_IDS].map((id) => TAB_NAME[id])
    let calls = 0
    const client = clientReturning(names.filter((name) => name !== 'Curious'))
    const wrapped: SheetsClient = {
      batchGetValues: (ranges) => {
        calls += 1
        return client.batchGetValues(ranges)
      },
      batchUpdateValues: () => Promise.resolve(),
    }
    const payload = await readAll(wrapped)
    expect(calls).toBe(1)
    expect(payload.lists.movies).toHaveLength(1)
    expect(payload.warnings.some((warning) => warning.code === 'missing_tab' && warning.tab === 'curious')).toBe(true)
    expect(payload.lists.curious).toEqual([])
  })

  it('skips a turned-off picks tab without warning that it is missing', async () => {
    const ranges: string[][] = []
    const client = clientReturning([...LIST_IDS, ...PICKS_IDS].map((id) => TAB_NAME[id]))
    const wrapped: SheetsClient = {
      batchGetValues: (requested) => {
        ranges.push(requested)
        return client.batchGetValues(requested)
      },
      batchUpdateValues: () => Promise.resolve(),
    }
    const payload = await readAll(wrapped, { skipPicks: ['games-picks'] })
    expect(ranges[0]?.some((range) => range.includes('Games picks'))).toBe(false)
    expect(payload.picks['games-picks']).toEqual([])
    expect(payload.warnings.some((warning) => warning.tab === 'games-picks')).toBe(false)
    expect(payload.lists.movies).toHaveLength(1)
    expect(Array.isArray(payload.picks['movies-picks'])).toBe(true)
  })

  it('does not import image providers', () => {
    const source = [readFileSync(resolve('server/sheets/readAll.ts'), 'utf8'), readFileSync(resolve('api/lists.ts'), 'utf8')].join('\n')
    expect(source).not.toMatch(/server\/images|tmdb|omdb|rawg|jikan|openlibrary/i)
  })

  it('does not call external image hosts', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('external fetch')
    })
    await readAll(clientReturning([...LIST_IDS, ...PICKS_IDS].map((id) => TAB_NAME[id])))
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})

describe('getCachedLists', () => {
  it('shares one in-flight load', async () => {
    resetListsCache()
    let calls = 0
    const loader = () => {
      calls += 1
      return readAll(clientReturning([...LIST_IDS, ...PICKS_IDS].map((id) => TAB_NAME[id])))
    }
    const [first, second] = await Promise.all([
      getCachedLists(loader, { ttlMs: 15_000, force: false }),
      getCachedLists(loader, { ttlMs: 15_000, force: false }),
    ])
    expect(calls).toBe(1)
    expect(first.dataHash).toBe(second.dataHash)
  })
})
