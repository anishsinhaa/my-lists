import dotenv from 'dotenv'
import { getEnv } from '../server/config/env.js'
import { createSheetsClient } from '../server/sheets/client.js'
import { readAll } from '../server/sheets/readAll.js'
import { LIST_IDS, PICKS_IDS, TAB_NAME } from '../src/types/lists.js'

dotenv.config()

const payload = await readAll(createSheetsClient(getEnv()))
for (const id of [...LIST_IDS, ...PICKS_IDS]) {
  const rows = (LIST_IDS as readonly string[]).includes(id) ? payload.lists[id as (typeof LIST_IDS)[number]] : payload.picks[id as (typeof PICKS_IDS)[number]]
  const columns = payload.columns[id]
  const missing = (['poster', 'creator', 'franchise', 'imdbRating'] as const).filter((field) => columns[field] === false)
  const empty = {
    poster: rows.filter((row) => row.poster === null).length,
    creator: rows.filter((row) => 'creator' in row && row.creator === null).length,
    franchise: rows.filter((row) => 'franchise' in row && row.franchise === null).length,
    imdbRating: rows.filter((row) => 'imdbRating' in row && row.imdbRating === null).length,
  }
  console.log(`${TAB_NAME[id]}: ${rows.length} rows; missing columns ${missing.join(', ') || 'none'}; empty poster ${empty.poster}, creator ${empty.creator}, franchise ${empty.franchise}, imdbRating ${empty.imdbRating}`)
}
for (const warning of payload.warnings) console.warn(`${warning.tab}: ${warning.code} ${warning.message}`)
