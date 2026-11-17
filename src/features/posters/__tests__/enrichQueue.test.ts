import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PosterFillResult } from '@/types/api'
import { fillPosters } from '@/services/images/posterApi'
import { enqueueFills, enrichIdle, enrichStats, resetEnrichQueue } from '../enrichQueue'

vi.mock('@/services/images/posterApi', () => ({ fillPosters: vi.fn() }))

function result(titleKey: string, outcome: PosterFillResult['outcome'] = 'ok'): PosterFillResult {
  return { tab: 'movies', titleKey, poster: 'https://img.example/p.jpg', creator: null, franchise: null, imdbRating: 8, written: { poster: true, imdbRating: true }, missed: [], outcome }
}

describe('enrich queue', () => {
  beforeEach(() => {
    resetEnrichQueue()
    vi.mocked(fillPosters).mockReset()
  })

  it('sends four titles in one request and does not request a settled title again', async () => {
    let current = 0
    let max = 0
    vi.mocked(fillPosters).mockImplementation(async (items) => {
      current += 1
      max = Math.max(max, current)
      await new Promise((resolve) => setTimeout(resolve, 20))
      current -= 1
      return items.map((item) => result(item.title.toLowerCase()))
    })
    const items = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map((title) => ({ tab: 'movies' as const, title, year: 2000, needs: ['poster' as const] }))
    enqueueFills(items)
    await enrichIdle()
    expect(max).toBe(1)
    expect(fillPosters).toHaveBeenCalledTimes(2)
    expect(vi.mocked(fillPosters).mock.calls[0]?.[0]).toHaveLength(4)
    expect(vi.mocked(fillPosters).mock.calls[1]?.[0]).toHaveLength(2)
    expect(vi.mocked(fillPosters).mock.calls.every((call) => call[1] === undefined)).toBe(true)
    enqueueFills(items)
    await enrichIdle()
    expect(fillPosters).toHaveBeenCalledTimes(2)
    expect(enrichStats('movies').done).toBe(6)
  })

  it('retries one failure and then leaves the title alone for the session', async () => {
    vi.mocked(fillPosters).mockRejectedValue(new Error('network'))
    enqueueFills([{ tab: 'movies', title: 'Heat', year: 1995, needs: ['poster'] }])
    await enrichIdle()
    expect(fillPosters).toHaveBeenCalledTimes(2)
    expect(enrichStats('movies').failed).toBe(1)
    enqueueFills([{ tab: 'movies', title: 'Heat', year: 1995, needs: ['poster'] }])
    await enrichIdle()
    expect(fillPosters).toHaveBeenCalledTimes(2)
  })
})
