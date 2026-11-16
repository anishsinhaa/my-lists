import type { VercelRequest, VercelResponse } from '@vercel/node'
import { describe, expect, it } from 'vitest'
import handler from '../../../api/health.js'
import { recordFailure, resetRateLimits } from '../rateLimit.js'

function fakeResponse(): { res: VercelResponse; statusCode: number; body: unknown } {
  const state = { statusCode: 200, body: undefined as unknown }
  const res = {
    status(code: number) {
      state.statusCode = code
      return this
    },
    json(data: unknown) {
      state.body = data
    },
    setHeader() {
      return this
    },
  }
  return { res: res as unknown as VercelResponse, get statusCode() { return state.statusCode }, get body() { return state.body } }
}

describe('health handler', () => {
  it('returns ok for GET and 405 for anything else', async () => {
    const okRes = fakeResponse()
    await handler({ method: 'GET' } as VercelRequest, okRes.res)
    expect(okRes.statusCode).toBe(200)
    expect(okRes.body).toEqual({ ok: true, data: { status: 'ok' } })

    const bad = fakeResponse()
    await handler({ method: 'POST' } as VercelRequest, bad.res)
    expect(bad.statusCode).toBe(405)
    expect(bad.body).toEqual({ ok: false, error: { code: 'bad_request', message: 'Method POST not allowed' } })
  })
})

describe('recordFailure', () => {
  it('blocks the 6th failure inside the window', () => {
    resetRateLimits()
    for (let i = 0; i < 5; i += 1) expect(recordFailure('ip', 1_000 + i).allowed).toBe(true)
    expect(recordFailure('ip', 1_006).allowed).toBe(false)
  })
})
