import type { VercelRequest } from '@vercel/node'

export function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  if (typeof value === 'string' && value.length > 0) return value.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}
