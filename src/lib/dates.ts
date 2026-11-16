const SHEET_EPOCH_MS = Date.UTC(1899, 11, 30)
const DAY_MS = 86_400_000

export function serialToIso(serial: number): string {
  const date = new Date(SHEET_EPOCH_MS + Math.trunc(serial) * DAY_MS)
  return date.toISOString().slice(0, 10)
}

export function parseYear(value: unknown): number | null {
  const source = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''
  const match = /(\d{4})/.exec(source)
  if (match === null) return null
  const year = Number(match[1])
  if (year < 1880 || year > 2100) return null
  return year
}

export function parseUpdatedAt(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const day = serialToIso(value)
    const fraction = value - Math.trunc(value)
    if (fraction <= 0) return `${day}T00:00:00.000Z`
    const ms = Math.round(fraction * DAY_MS)
    return new Date(SHEET_EPOCH_MS + Math.trunc(value) * DAY_MS + ms).toISOString()
  }
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (text.length === 0) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = new Date(text)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toISOString()
  }
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(text)
  if (match === null) return null
  const first = Number(match[1])
  const second = Number(match[2])
  const year = Number(match[3])
  const hours = match[4] === undefined ? 0 : Number(match[4])
  const minutes = match[5] === undefined ? 0 : Number(match[5])
  let day = first
  let month = second
  if (first <= 12 && second > 12) {
    month = first
    day = second
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) return null
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.toISOString()
}
