import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthProvider } from '../../server/auth/index.js'
import { signToken } from '../../server/auth/tokens.js'
import { clientIp } from '../../server/http/clientIp.js'
import { recordFailure } from '../../server/http/rateLimit.js'
import { fail, methodGuard, ok } from '../../server/http/respond.js'
import { sessionCookieHeader } from '../../server/http/sessionCookie.js'

const FAILURE_DELAY_MS = 400

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    await login(req, res)
  } catch {
    fail(res, 'internal', 'Something went wrong', 500)
  }
}

async function login(req: VercelRequest, res: VercelResponse): Promise<void> {
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
    fail(res, 'unauthorized', 'Invalid credentials', 401)
    return
  }
  const session = await signToken(user)
  const maxAge = Math.max(0, Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000))
  res.setHeader('Set-Cookie', sessionCookieHeader(session.token, maxAge))
  ok(res, { expiresAt: session.expiresAt, user })
}
