import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getEnv } from '../../server/config/env.js'
import { fail, methodGuard, ok } from '../../server/http/respond.js'
import { withAuth } from '../../server/http/withAuth.js'
import { PickStatusError, updatePickStatus } from '../../server/picks/updatePickStatus.js'
import { createSheetsClient } from '../../server/sheets/client.js'
import type { PickStatusRequest } from '../../src/types/api.js'
import { PICKS_IDS } from '../../src/types/lists.js'

function isRequest(body: unknown): body is PickStatusRequest {
  if (typeof body !== 'object' || body === null) return false
  const record = body as Record<string, unknown>
  return typeof record.picksId === 'string' && (PICKS_IDS as readonly string[]).includes(record.picksId) && typeof record.title === 'string' && (typeof record.year === 'number' || record.year === null) && typeof record.because === 'string' && typeof record.status === 'string' && typeof record.expectedCurrent === 'string'
}

async function status(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (getEnv().FEATURE_PICKS !== 'true') {
    fail(res, 'feature_disabled', 'Picks are disabled', 404)
    return
  }
  if (!methodGuard(req, res, ['POST'])) return
  if (!isRequest(req.body)) {
    fail(res, 'bad_request', 'Invalid pick status', 400)
    return
  }
  try {
    ok(res, await updatePickStatus(createSheetsClient(getEnv()), req.body))
  } catch (error) {
    if (error instanceof PickStatusError) {
      fail(res, 'bad_request', error.message, error.status)
      return
    }
    fail(res, 'internal', 'Could not update pick', 500)
  }
}

export default withAuth(status)
