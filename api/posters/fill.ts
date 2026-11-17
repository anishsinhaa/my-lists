import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getEnv } from '../../server/config/env.js'
import { enrichItems, parseFillItems } from '../../server/images/enrich.js'
import { createSheetsClient } from '../../server/sheets/client.js'
import { fail, methodGuard, ok } from '../../server/http/respond.js'
import { withAuth } from '../../server/http/withAuth.js'

async function fill(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['POST'])) return
  try {
    const items = parseFillItems(req.body)
    ok(res, await enrichItems(createSheetsClient(getEnv()), items))
  } catch {
    fail(res, 'bad_request', 'Invalid enrichment request', 400)
  }
}

export default withAuth(fill)
