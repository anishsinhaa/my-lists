import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../auth/tokens.js'
import { fail } from './respond.js'
import type { RequestContext } from './types.js'

type AuthedHandler = (req: VercelRequest, res: VercelResponse, ctx: RequestContext) => Promise<void>

export function withAuth(handler: AuthedHandler) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    const header = req.headers.authorization
    const value = Array.isArray(header) ? header[0] : header
    const token = typeof value === 'string' && value.startsWith('Bearer ') ? value.slice('Bearer '.length) : undefined
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
  }
}
