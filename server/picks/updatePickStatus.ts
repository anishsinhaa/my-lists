import { normalizeTitle } from '../../src/lib/normalize.js'
import { PICK_STATUS_OPTIONS } from '../../src/types/picks.js'
import type { PickStatusRequest, PickStatusResult } from '../../src/types/api.js'
import type { SheetsClient } from '../sheets/client.js'
import { writeCells } from '../sheets/writeCells.js'

export class PickStatusError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'PickStatusError'
    this.status = status
  }
}

export async function updatePickStatus(client: SheetsClient, req: PickStatusRequest): Promise<PickStatusResult> {
  const options = PICK_STATUS_OPTIONS[req.picksId]
  const allowed = req.status === '' || options.includes(req.status)
  const expectedOk = req.expectedCurrent === '' || options.includes(req.expectedCurrent)
  if (req.status.toLowerCase() === 'skip' || !allowed || !expectedOk) throw new PickStatusError(400, 'Invalid pick status')
  const [result] = await writeCells(client, [{
    tab: req.picksId,
    field: 'pickStatus',
    titleKey: normalizeTitle(req.title),
    year: req.year,
    becauseKey: normalizeTitle(req.because),
    value: req.status,
    expectedCurrent: req.expectedCurrent,
  }])
  if (result === undefined) return { outcome: 'error' }
  if (result.outcome === 'written') return { outcome: 'written' }
  if (result.outcome === 'skipped_conflict') return { outcome: 'conflict', currentValue: result.currentValue }
  if (result.outcome === 'skipped_not_found') return { outcome: 'not_found' }
  if (result.outcome === 'skipped_ambiguous') return { outcome: 'ambiguous' }
  return { outcome: 'error' }
}
