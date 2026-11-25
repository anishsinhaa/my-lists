import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { getEnv } from '../../server/config/env.js'
import { backfillAll, toReportLine } from '../../server/images/backfill.js'
import { fail, methodGuard, ok } from '../../server/http/respond.js'
import { requireAccountOwner } from '../../server/auth/permissions.js'
import { enrichStatus, startEnrichJob } from '../../server/settings/enrichJob.js'
import { loadSettings } from '../../server/settings/store.js'
import { createSheetsClient } from '../../server/sheets/client.js'
import { POSTER_LISTS, type ListId } from '../../src/types/lists.js'

const bodySchema = z.object({
  tab: z.enum(['all', 'movies', 'series', 'anime', 'games', 'books']).default('all'),
  force: z.boolean().default(false),
})

async function enrich(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!methodGuard(req, res, ['POST'])) return
  const parsed = bodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    fail(res, 'bad_request', 'Choose all tabs or one list tab', 400)
    return
  }
  if (parsed.data.force && parsed.data.tab === 'all') {
    fail(res, 'bad_request', 'Force refetch needs one tab', 400)
    return
  }
  const tabs: readonly ListId[] = parsed.data.tab === 'all' ? POSTER_LISTS : [parsed.data.tab]
  const mode = parsed.data.force ? 'force' : 'fill'
  await loadSettings()
  const started = startEnrichJob({
    mode,
    target: parsed.data.tab,
    run: async (onProgress) => {
      const reports = await backfillAll(createSheetsClient(getEnv()), () => undefined, {
        tabs,
        force: parsed.data.force,
        onProgress,
      })
      return reports.map(toReportLine)
    },
  })
  if (!started) {
    fail(res, 'conflict', 'A refresh is already running', 409)
    return
  }
  ok(res, enrichStatus(), 202)
}

export default requireAccountOwner(enrich)
