import { SignJWT } from 'jose'
import { afterEach, describe, expect, it } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import guest from '../../../api/auth/guest.js'
import login from '../../../api/auth/login.js'
import logout from '../../../api/auth/logout.js'
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
  process.env.GUEST_MODE = 'true'
  process.env.GUEST_EXPIRES_IN = '7d'
  resetEnvCache()
  resetRateLimits()
}

afterEach(() => {
  delete process.env.GUEST_MODE
  resetEnvCache()
})

function capture(): { res: VercelResponse; status: () => number; body: () => unknown; header: (name: string) => string | undefined } {
  const state = { statusCode: 200, payload: undefined as unknown, headers: {} as Record<string, string> }
  const res = {
    status(code: number) {
      state.statusCode = code
      return this
    },
    json(data: unknown) {
      state.payload = data
    },
    setHeader(name: string, value: string) {
      state.headers[name.toLowerCase()] = value
      return this
    },
  }
  return { res: res as unknown as VercelResponse, status: () => state.statusCode, body: () => state.payload, header: (name: string) => state.headers[name.toLowerCase()] }
}

describe('EnvAuthProvider', () => {
  const provider = new EnvAuthProvider('anish', HASH)

  it('accepts the right password and rejects either wrong field', async () => {
    await expect(provider.authenticate('anish', PASSWORD)).resolves.toEqual({ id: 'local', username: 'anish', role: 'owner', accountId: 'main' })
    await expect(provider.authenticate('anish', 'nope')).resolves.toBeNull()
    await expect(provider.authenticate('other', PASSWORD)).resolves.toBeNull()
  })
})

describe('tokens', () => {
  it('rejects expired and garbage tokens', async () => {
    useEnv()
    const session = await signToken({ id: 'local', username: 'anish', role: 'owner', accountId: 'main' })
    await expect(verifyToken(session.token)).resolves.toEqual({ id: 'local', username: 'anish', role: 'owner', accountId: 'main' })
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
  it('sets an httpOnly cookie for the right password and the same error for both wrong fields', async () => {
    useEnv()
    const good = capture()
    await login({ method: 'POST', body: { username: 'anish', password: PASSWORD }, headers: { 'x-forwarded-for': '1.1.1.1' } } as unknown as VercelRequest, good.res)
    expect(good.status()).toBe(200)
    const payload = good.body() as { ok: boolean; data: { user: { username: string }; token?: string } }
    expect(payload.ok).toBe(true)
    expect(payload.data.user.username).toBe('anish')
    expect(payload.data.token).toBeUndefined()
    const setCookie = good.header('set-cookie') ?? ''
    expect(setCookie).toContain('ml.session=')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie.split(';').slice(1).join(';')).not.toContain('Secure')
    const cookie = setCookie.split(';')[0] ?? ''

    const wrongPassword = capture()
    await login({ method: 'POST', body: { username: 'anish', password: 'nope' }, headers: { 'x-forwarded-for': '2.2.2.2' } } as unknown as VercelRequest, wrongPassword.res)
    const wrongUser = capture()
    await login({ method: 'POST', body: { username: 'other', password: PASSWORD }, headers: { 'x-forwarded-for': '3.3.3.3' } } as unknown as VercelRequest, wrongUser.res)
    expect(wrongPassword.body()).toEqual(wrongUser.body())
    expect(wrongPassword.body()).toEqual({ ok: false, error: { code: 'unauthorized', message: 'Invalid credentials' } })
    expect(wrongPassword.status()).toBe(401)

    const missing = capture()
    await me({ method: 'GET', headers: {} } as unknown as VercelRequest, missing.res)
    expect(missing.status()).toBe(401)

    const present = capture()
    await me({ method: 'GET', headers: { cookie } } as unknown as VercelRequest, present.res)
    expect(present.status()).toBe(200)
    expect(present.body()).toEqual({ ok: true, data: { user: { id: 'local', username: 'anish', role: 'owner', accountId: 'main' } } })

    const signedOut = capture()
    await logout({ method: 'POST', headers: {} } as unknown as VercelRequest, signedOut.res)
    expect(signedOut.status()).toBe(200)
    expect(signedOut.header('set-cookie')).toContain('Max-Age=0')
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

describe('guest sessions', () => {
  const key = { kty: 'oct' as const, k: Buffer.from(JWT_SECRET).toString('base64url') }

  it('sets a guest cookie', async () => {
    useEnv()
    const res = capture()
    await guest({ method: 'POST', headers: { 'x-forwarded-for': '8.8.4.4' } } as unknown as VercelRequest, res.res)
    expect(res.status()).toBe(200)
    const setCookie = res.header('set-cookie') ?? ''
    expect(setCookie).toContain('ml.session=')
    const body = res.body() as { ok: boolean; data: { user: { role: string; accountId: string } } }
    expect(body.ok).toBe(true)
    expect(body.data.user).toEqual({ id: 'guest', username: 'Guest', role: 'guest', accountId: 'main' })
  })

  it('turns guest mode off and stops verifying guest tokens', async () => {
    useEnv()
    const session = await signToken({ id: 'guest', username: 'Guest', role: 'guest', accountId: 'main' })
    process.env.GUEST_MODE = 'false'
    resetEnvCache()
    await expect(verifyToken(session.token)).resolves.toBeNull()
    const blocked = capture()
    await guest({ method: 'POST', headers: { 'x-forwarded-for': '4.4.4.4' } } as unknown as VercelRequest, blocked.res)
    expect(blocked.status()).toBe(404)
    expect(blocked.body()).toEqual({ ok: false, error: { code: 'feature_disabled', message: 'Guest mode is off' } })
  })

  it('treats a legacy owner token as the owner and rejects a role-less guest subject', async () => {
    useEnv()
    const legacy = await new SignJWT({ username: 'anish' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('local')
      .setIssuer('my-lists')
      .setExpirationTime('30d')
      .sign(key)
    await expect(verifyToken(legacy)).resolves.toEqual({ id: 'local', username: 'anish', role: 'owner', accountId: 'main' })
    const stranger = await new SignJWT({ username: 'Guest' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('guest')
      .setIssuer('my-lists')
      .setExpirationTime('30d')
      .sign(key)
    await expect(verifyToken(stranger)).resolves.toBeNull()
  })

  it('rate limits the 21st guest session from the same IP', async () => {
    useEnv()
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const res = capture()
      await guest({ method: 'POST', headers: { 'x-forwarded-for': '7.7.7.7' } } as unknown as VercelRequest, res.res)
      expect(res.status()).toBe(200)
    }
    const blocked = capture()
    await guest({ method: 'POST', headers: { 'x-forwarded-for': '7.7.7.7' } } as unknown as VercelRequest, blocked.res)
    expect(blocked.status()).toBe(429)
    expect(blocked.body()).toEqual({ ok: false, error: { code: 'rate_limited', message: 'Too many guest sessions, try again later' } })
  }, 20_000)
})
