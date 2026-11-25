import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../auth/tokens.js'
import { fail } from './respond.js'
import { readCookie, SESSION_COOKIE } from './sessionCookie.js'
import type { RequestContext } from './types.js'

export type AuthedHandler = (req: VercelRequest, res: VercelResponse, ctx: RequestContext) => Promise<void>

function presentedToken(req: VercelRequest): string | undefined {
  const cookie = readCookie(req.headers.cookie, SESSION_COOKIE)
  if (cookie !== undefined && cookie.length > 0) return cookie
  const header = req.headers.authorization
  const value = Array.isArray(header) ? header[0] : header
  return typeof value === 'string' && value.startsWith('Bearer ') ? value.slice('Bearer '.length) : undefined
}

export function withAuth(handler: AuthedHandler) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
      const token = presentedToken(req)
      if (token === undefined || token.length === 0) {
        fail(res, 'unauthorized', 'Unauthorized', 401)
        return
      }
      const user = await verifyToken(token)
      if (user === null) {
        fail(res, 'unauthorized', 'Unauthorized', 401)
        return
      }
      await handler(req, res, { user })
    } catch {
      fail(res, 'internal', 'Something went wrong', 500)
    }
  }
}
