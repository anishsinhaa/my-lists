import { SignJWT } from 'jose'
import { afterEach, describe, expect, it } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import login from '../../../api/auth/login.js'
import me from '../../../api/auth/me.js'
import { resetEnvCache } from '../../config/env.js'
import { resetRateLimits } from '../../http/rateLimit.js'
import { EnvAuthProvider } from '../EnvAuthProvider.js'
import { signToken, verifyToken } from '../tokens.js'

const PASSWORD = 'dummy-password-not-used'
const HASH = '$2b$12$zigsia//994jEQvd8AlEG.HG8HoftXQK5eymy9HuJcIPFnSchQzEG'
const JWT_SECRET = 'test-secret-that-is-at-least-32-chars'

function useEnv(): void {
  process.env.AUTH_USERNAME = 'anish'
  process.env.AUTH_PASSWORD_HASH = HASH
  process.env.JWT_SECRET = JWT_SECRET
  process.env.JWT_EXPIRES_IN = '30d'
  process.env.GOOGLE_SHEET_ID = 'sheet'
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'bot@example.com'
  process.env.GOOGLE_PRIVATE_KEY = 'key'
  process.env.TMDB_READ_TOKEN = 'tmdb'
  process.env.RAWG_API_KEY = 'rawg'
  process.env.OPEN_LIBRARY_CONTACT = 'me@example.com'
  resetEnvCache()
  resetRateLimits()
}

afterEach(() => {
  resetEnvCache()
})

function capture(): { res: VercelResponse; status: () => number; body: () => unknown } {
  const state = { statusCode: 200, payload: undefined as unknown }
  const res = {
    status(code: number) {
      state.statusCode = code
      return this
    },
    json(data: unknown) {
      state.payload = data
    },
    setHeader() {
      return this
    },
  }
  return { res: res as unknown as VercelResponse, status: () => state.statusCode, body: () => state.payload }
}

describe('EnvAuthProvider', () => {
  const provider = new EnvAuthProvider('anish', HASH)

  it('accepts the right password and rejects either wrong field', async () => {
    await expect(provider.authenticate('anish', PASSWORD)).resolves.toEqual({ id: 'local', username: 'anish' })
    await expect(provider.authenticate('anish', 'nope')).resolves.toBeNull()
    await expect(provider.authenticate('other', PASSWORD)).resolves.toBeNull()
  })
})

describe('tokens', () => {
  it('rejects expired and garbage tokens', async () => {
    useEnv()
    const session = await signToken({ id: 'local', username: 'anish' })
    await expect(verifyToken(session.token)).resolves.toEqual({ id: 'local', username: 'anish' })
    const expired = await new SignJWT({ username: 'anish' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('local')
      .setIssuer('my-lists')
      .setExpirationTime('0s')
      .sign({ kty: 'oct', k: Buffer.from(JWT_SECRET).toString('base64url') })
    await expect(verifyToken(expired)).resolves.toBeNull()
    await expect(verifyToken('not-a-token')).resolves.toBeNull()
  })
})

describe('login and me', () => {
  it('returns a token for the right password and the same error for both wrong fields', async () => {
    useEnv()
    const good = capture()
    await login({ method: 'POST', body: { username: 'anish', password: PASSWORD }, headers: { 'x-forwarded-for': '1.1.1.1' } } as unknown as VercelRequest, good.res)
    expect(good.status()).toBe(200)
    const payload = good.body() as { ok: boolean; data: { token: string; user: { username: string } } }
    expect(payload.ok).toBe(true)
    expect(payload.data.user.username).toBe('anish')

    const wrongPassword = capture()
    await login({ method: 'POST', body: { username: 'anish', password: 'nope' }, headers: { 'x-forwarded-for': '2.2.2.2' } } as unknown as VercelRequest, wrongPassword.res)
    const wrongUser = capture()
    await login({ method: 'POST', body: { username: 'other', password: PASSWORD }, headers: { 'x-forwarded-for': '3.3.3.3' } } as unknown as VercelRequest, wrongUser.res)
    expect(wrongPassword.body()).toEqual(wrongUser.body())
    expect(wrongPassword.status()).toBe(401)

    const missing = capture()
    await me({ method: 'GET', headers: {} } as unknown as VercelRequest, missing.res)
    expect(missing.status()).toBe(401)

    const present = capture()
    await me({ method: 'GET', headers: { authorization: `Bearer ${payload.data.token}` } } as unknown as VercelRequest, present.res)
    expect(present.status()).toBe(200)
    expect(present.body()).toEqual({ ok: true, data: { user: { id: 'local', username: 'anish' } } })
  }, 20_000)

  it('rate limits the 6th failure', async () => {
    useEnv()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = capture()
      await login({ method: 'POST', body: { username: 'anish', password: 'nope' }, headers: { 'x-forwarded-for': '9.9.9.9' } } as unknown as VercelRequest, res.res)
      expect(res.status()).toBe(401)
    }
    const blocked = capture()
    await login({ method: 'POST', body: { username: 'anish', password: 'nope' }, headers: { 'x-forwarded-for': '9.9.9.9' } } as unknown as VercelRequest, blocked.res)
    expect(blocked.status()).toBe(429)
    expect(blocked.body()).toEqual({ ok: false, error: { code: 'rate_limited', message: 'Too many login attempts' } })
  }, 20_000)
})
