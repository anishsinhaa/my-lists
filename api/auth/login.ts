import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthProvider } from '../../server/auth/index.js'
import { signToken } from '../../server/auth/tokens.js'
import { recordFailure } from '../../server/http/rateLimit.js'
import { fail, methodGuard, ok } from '../../server/http/respond.js'

const FAILURE_DELAY_MS = 400

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  if (typeof value === 'string' && value.length > 0) return value.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['POST'])) return
  const body = req.body
  const username = typeof body === 'object' && body !== null && 'username' in body ? body.username : undefined
  const password = typeof body === 'object' && body !== null && 'password' in body ? body.password : undefined
  if (typeof username !== 'string' || typeof password !== 'string') {
    fail(res, 'bad_request', 'Username and password are required', 400)
    return
  }
  const user = await getAuthProvider().authenticate(username, password)
  if (user === null) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS))
    const limit = recordFailure(clientIp(req))
    if (!limit.allowed) {
      fail(res, 'rate_limited', 'Too many login attempts', 429)
      return
    }
    fail(res, 'unauthorized', 'Invalid username or password', 401)
    return
  }
  const session = await signToken(user)
  ok(res, { token: session.token, expiresAt: session.expiresAt, user })
}
