import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getEnv } from '../../server/config/env.js'
import { resetListsCache } from '../../server/sheets/cache.js'
import { createSheetsClient } from '../../server/sheets/client.js'
import { updateListItem, type ItemUpdate } from '../../server/lists/updateItem.js'
import { fail, methodGuard, ok } from '../../server/http/respond.js'
import { withAuth } from '../../server/http/withAuth.js'
import { LIST_IDS } from '../../src/types/lists.js'

function isUpdate(body: unknown): body is ItemUpdate {
  if (typeof body !== 'object' || body === null) return false
  const record = body as Record<string, unknown>
  const rating = record.myRating
  return typeof record.listId === 'string' && (LIST_IDS as readonly string[]).includes(record.listId) && typeof record.id === 'string' && typeof record.title === 'string' && (typeof record.year === 'number' || record.year === null) && typeof record.status === 'string' && (rating === null || typeof rating === 'number') && (record.why === undefined || typeof record.why === 'string')
}

async function item(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['POST'])) return
  if (!isUpdate(req.body)) {
    fail(res, 'bad_request', 'Invalid item update', 400)
    return
  }
  const result = await updateListItem(createSheetsClient(getEnv()), req.body)
  if (result.outcome === 'written') resetListsCache()
  if (result.outcome === 'invalid') {
    fail(res, 'bad_request', result.detail ?? 'Invalid item update', 400)
    return
  }
  ok(res, result)
}

export default withAuth(item)
