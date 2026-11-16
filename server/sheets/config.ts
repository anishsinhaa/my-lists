import type { AuthUser } from '../../src/types/auth.js'
import { getEnv } from '../config/env.js'

export function getSheetIdForUser(_user: AuthUser): string {
  return getEnv().GOOGLE_SHEET_ID
}
