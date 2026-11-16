import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodGuard, ok } from '../../server/http/respond.js'
import { withAuth } from '../../server/http/withAuth.js'
import type { RequestContext } from '../../server/http/types.js'

async function me(req: VercelRequest, res: VercelResponse, ctx: RequestContext): Promise<void> {
  if (!methodGuard(req, res, ['GET'])) return
  ok(res, { user: ctx.user })
}

export default withAuth(me)
