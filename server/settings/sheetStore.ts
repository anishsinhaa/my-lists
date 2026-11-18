import type { LastRun } from '../../src/types/settings.js'
import { getEnv } from '../config/env.js'
import { createSheetsClient, ensureSheet } from '../sheets/client.js'
import { defaultSettings, settingsFromRows, type SettingsFile } from './store.js'

const TAB = 'Settings'

function compact(lastRun: LastRun): LastRun {
  if (JSON.stringify(lastRun).length <= 45_000) return lastRun
  return { ...lastRun, lines: [], summary: lastRun.summary.slice(0, 500) }
}

export async function readSheetSettings(): Promise<SettingsFile> {
  try {
    const [batch] = await createSheetsClient(getEnv()).batchGetValues([`'${TAB}'!A1:B2`])
    return settingsFromRows(batch?.values ?? [])
  } catch {
    return defaultSettings()
  }
}

export async function writeSheetSettings(next: SettingsFile): Promise<void> {
  const env = getEnv()
  await ensureSheet(env, TAB)
  const lastRun = next.lastRun === null ? '' : JSON.stringify(compact(next.lastRun))
  await createSheetsClient(env).batchUpdateValues([
    { range: `'${TAB}'!A1`, value: 'picks' },
    { range: `'${TAB}'!B1`, value: JSON.stringify(next.picks) },
    { range: `'${TAB}'!A2`, value: 'lastRun' },
    { range: `'${TAB}'!B2`, value: lastRun },
  ])
}
