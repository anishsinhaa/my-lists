import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodGuard, ok } from '../../server/http/respond.js'
import { clearSessionCookieHeader } from '../../server/http/sessionCookie.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['POST'])) return
  res.setHeader('Set-Cookie', clearSessionCookieHeader())
  ok(res, { signedOut: true })
}
