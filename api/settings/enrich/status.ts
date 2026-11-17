import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodGuard, ok } from '../../../server/http/respond.js'
import { withAuth } from '../../../server/http/withAuth.js'
import { enrichStatus } from '../../../server/settings/enrichJob.js'

async function status(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['GET'])) return
  ok(res, enrichStatus())
}

export default withAuth(status)
