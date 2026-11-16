import { createHash } from 'node:crypto'
import { LIST_IDS, PICKS_IDS, TAB_NAME, type ListId, type PicksId } from '../../src/types/lists.js'
import type { EnrichField, ListsPayload, MediaItem, PickItem, SheetWarning } from '../../src/types/media.js'
import type { SheetsClient } from './client.js'
import { mapMainTab, mapPicksTab } from './mapping.js'

const TABS = [...LIST_IDS, ...PICKS_IDS] as const
const EMPTY_COLUMNS: Record<EnrichField, boolean> = { poster: false, creator: false, franchise: false, imdbRating: false }

function rangeFor(tabName: string): string {
  return `'${tabName}'!A1:Z3000`
}

function valuesFor(tabName: string, batches: Array<{ range: string; values: unknown[][] }>, index: number): unknown[][] | null {
  const indexed = batches[index]
  if (indexed !== undefined && indexed.range.toLowerCase().includes(tabName.toLowerCase())) return indexed.values
  const found = batches.find((batch) => batch.range.toLowerCase().includes(tabName.toLowerCase()))
  return found === undefined ? null : found.values
}

export async function readAll(client: SheetsClient): Promise<ListsPayload> {
  const ranges = TABS.map((id) => rangeFor(TAB_NAME[id]))
  let batches: Array<{ range: string; values: unknown[][] }>
  try {
    batches = await client.batchGetValues(ranges)
  } catch {
    batches = []
    for (const range of ranges) {
      try {
        const [one] = await client.batchGetValues([range])
        if (one !== undefined) batches.push(one)
      } catch {
        // A renamed or missing tab must not fail the whole read.
      }
    }
  }

  const lists = {} as Record<ListId, MediaItem[]>
  const picks = {} as Record<PicksId, PickItem[]>
  const warnings: SheetWarning[] = []
  const columns = {} as ListsPayload['columns']

  TABS.forEach((id, index) => {
    const values = valuesFor(TAB_NAME[id], batches, index)
    if (values === null) {
      warnings.push({ tab: id, code: 'missing_tab', message: `Tab "${TAB_NAME[id]}" was not found` })
      columns[id] = { ...EMPTY_COLUMNS }
      if ((PICKS_IDS as readonly string[]).includes(id)) picks[id as PicksId] = []
      else lists[id as ListId] = []
      return
    }
    if ((PICKS_IDS as readonly string[]).includes(id)) {
      const mapped = mapPicksTab(id as PicksId, values)
      picks[id as PicksId] = mapped.items
      warnings.push(...mapped.warnings)
      columns[id] = mapped.columns
      return
    }
    const mapped = mapMainTab(id as ListId, values)
    lists[id as ListId] = mapped.items
    warnings.push(...mapped.warnings)
    columns[id] = mapped.columns
  })

  const dataHash = createHash('sha1').update(JSON.stringify({ lists, picks })).digest('hex')
  return { fetchedAt: new Date().toISOString(), dataHash, lists, picks, warnings, columns }
}
