import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodGuard, ok } from '../server/http/respond.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['GET'])) return
  ok(res, { status: 'ok' })
}
