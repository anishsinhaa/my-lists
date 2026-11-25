import type { VercelRequest, VercelResponse } from '@vercel/node'
import { canEdit, DEFAULT_ACCOUNT_ID } from '../../src/types/auth.js'
import { fail } from '../http/respond.js'
import type { RequestContext } from '../http/types.js'
import { withAuth, type AuthedHandler } from '../http/withAuth.js'

export function accountIdForRequest(ctx: RequestContext): string {
  return ctx.user?.accountId ?? DEFAULT_ACCOUNT_ID
}

export function requireAccountOwner(handler: AuthedHandler) {
  return withAuth(async (req: VercelRequest, res: VercelResponse, ctx: RequestContext) => {
    if (!canEdit(ctx.user, accountIdForRequest(ctx))) {
      fail(res, 'forbidden', 'View only. Sign in as the owner to make changes.', 403)
      return
    }
    await handler(req, res, ctx)
  })
}
