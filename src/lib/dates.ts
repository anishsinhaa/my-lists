const SHEET_EPOCH_MS = Date.UTC(1899, 11, 30)
const DAY_MS = 86_400_000

export function serialToIso(serial: number): string {
  const date = new Date(SHEET_EPOCH_MS + Math.trunc(serial) * DAY_MS)
  return date.toISOString().slice(0, 10)
}

export function parseSheetDate(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 20_000 && value <= 80_000) return serialToIso(value)
    return String(value)
  }
  if (typeof value !== 'string') return ''
  const text = value.trim()
  if (text.length === 0) return ''
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const serial = Number(text)
    if (serial >= 20_000 && serial <= 80_000) return serialToIso(serial)
  }
  return text
}

export function parseYear(value: unknown): number | null {
  const source = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''
  const match = /(\d{4})/.exec(source)
  if (match === null) return null
  const year = Number(match[1])
  if (year < 1880 || year > 2100) return null
  return year
}

function istPart(date: Date, type: Intl.DateTimeFormatPartTypes): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const value = parts.find((part) => part.type === type)?.value ?? ''
  return type === 'hour' && value === '24' ? '00' : value
}

export function formatIstStamp(date: Date): string {
  return `${istPart(date, 'year')}-${istPart(date, 'month')}-${istPart(date, 'day')} ${istPart(date, 'hour')}:${istPart(date, 'minute')}`
}

export function formatIstDay(date: Date): string {
  return formatIstStamp(date).slice(0, 10)
}

export function parseDateAdded(value: unknown): string | null {
  if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim())) {
    const serial = Number(value.trim())
    if (serial >= 20_000 && serial <= 80_000) return parseUpdatedAt(serial)
  }
  return parseUpdatedAt(value)
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
  const ist = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(text)
  if (ist !== null) {
    const parsed = new Date(`${ist[1]}-${ist[2]}-${ist[3]}T${ist[4]}:${ist[5]}:00+05:30`)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toISOString()
  }
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
