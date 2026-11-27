export function stripTrailingYear(value: string): string {
  let title = value.trim()
  let previous = ''
  while (title !== previous) {
    previous = title
    title = title.replace(/\s*[([]\s*(?:19|20)\d{2}\s*[)\]]\s*$/u, '').trim()
  }
  return title
}

const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' }

export function normalizeTitle(value: string): string {
  return stripTrailingYear(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll('&', 'and')
    .replace(/[-–—_/]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/g, (token) => ROMAN[token] ?? token)
    .replace(/\s+/g, ' ')
    .trim()
}

export function sortTitle(title: string): string {
  return stripTrailingYear(title)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll('&', 'and')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeKey(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function splitGenres(value: unknown): string[] {
  if (typeof value !== 'string' && typeof value !== 'number') return []
  const seen = new Set<string>()
  const genres: string[] = []
  for (const part of String(value).split(/[,/;|]/)) {
    const trimmed = part.trim()
    if (trimmed.length === 0) continue
    const titled = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    const key = titled.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    genres.push(titled)
  }
  return genres
}

export function sanitizePosterUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  if (url.length === 0 || url.length > 500) return null
  if (!url.startsWith('https://')) return null
  try {
    if (new URL(url).protocol !== 'https:') return null
  } catch {
    return null
  }
  return url
}
