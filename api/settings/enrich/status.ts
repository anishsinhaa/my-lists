import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodGuard, ok } from '../../../server/http/respond.js'
import { withAuth } from '../../../server/http/withAuth.js'
import { enrichStatus } from '../../../server/settings/enrichJob.js'
import { loadSettings } from '../../../server/settings/store.js'

async function status(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['GET'])) return
  const progress = enrichStatus()
  const stored = await loadSettings()
  ok(res, { ...progress, lastRun: progress.lastRun ?? stored.lastRun })
}

export default withAuth(status)
