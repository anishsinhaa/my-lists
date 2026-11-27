import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const HOSTS = [
  'https://image.tmdb.org',
  'https://*.rawg.io',
  'https://covers.openlibrary.org',
  'https://archive.org',
  'https://*.archive.org',
  'https://cdn.myanimelist.net',
  'https://books.google.com',
  'https://*.googleusercontent.com',
]

function header(name: string): string {
  const raw = readFileSync(resolve('vercel.json'), 'utf8')
  const config = JSON.parse(raw) as { headers: Array<{ headers: Array<{ key: string; value: string }> }> }
  const found = config.headers.flatMap((block) => block.headers).find((entry) => entry.key === 'Content-Security-Policy')
  if (found === undefined) throw new Error('Missing CSP')
  const directive = found.value.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `))
  if (directive === undefined) throw new Error(`Missing ${name}`)
  return directive
}

describe('content security policy', () => {
  it('allows book cover hosts and keeps script-src self', () => {
    const images = header('img-src')
    for (const host of HOSTS) expect(images).toContain(host)
    expect(header('script-src')).toBe("script-src 'self'")
  })
})
