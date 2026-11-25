import type { VercelRequest, VercelResponse } from '@vercel/node'
import { DEFAULT_ACCOUNT_ID } from '../../src/types/auth.js'
import { getEnv } from '../../server/config/env.js'
import { signToken } from '../../server/auth/tokens.js'
import { clientIp } from '../../server/http/clientIp.js'
import { recordFailure } from '../../server/http/rateLimit.js'
import { fail, methodGuard, ok } from '../../server/http/respond.js'
import { sessionCookieHeader } from '../../server/http/sessionCookie.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    await guest(req, res)
  } catch {
    fail(res, 'internal', 'Something went wrong', 500)
  }
}

async function guest(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['POST'])) return
  if (getEnv().GUEST_MODE !== 'true') {
    fail(res, 'feature_disabled', 'Guest mode is off', 404)
    return
  }
  const limit = recordFailure(`guest:${clientIp(req)}`, Date.now(), 15 * 60 * 1000, 20)
  if (!limit.allowed) {
    fail(res, 'rate_limited', 'Too many guest sessions, try again later', 429)
    return
  }
  const user = { id: 'guest', username: 'Guest', role: 'guest' as const, accountId: DEFAULT_ACCOUNT_ID }
  const session = await signToken(user)
  const maxAge = Math.max(0, Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000))
  res.setHeader('Set-Cookie', sessionCookieHeader(session.token, maxAge))
  ok(res, { expiresAt: session.expiresAt, user })
}
