const KEY = 'ml.enrichMiss.v1'
const TTL = 7 * 24 * 60 * 60 * 1000

function read(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as Record<string, number>
  } catch {
    return {}
  }
}

export function isRecentMiss(key: string, now = Date.now()): boolean {
  const stamped = read()[key]
  return typeof stamped === 'number' && now - stamped < TTL
}

export function markMiss(key: string, now = Date.now()): void {
  const current = read()
  current[key] = now
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Ignore quota failures. The next page load can try again.
  }
}

export function missKey(tab: string, titleKey: string, year: number | null, field: string): string {
  return `${tab}:${titleKey}:${year ?? ''}:${field}`
}
