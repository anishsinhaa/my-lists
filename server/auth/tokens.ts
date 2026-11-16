import { SignJWT, jwtVerify } from 'jose'
import type { AuthUser } from '../../src/types/auth.js'
import { getEnv } from '../config/env.js'

function key(): { kty: 'oct'; k: string } {
  return { kty: 'oct', k: Buffer.from(getEnv().JWT_SECRET).toString('base64url') }
}

export async function signToken(user: AuthUser): Promise<{ token: string; expiresAt: string }> {
  const token = await new SignJWT({ username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer('my-lists')
    .setIssuedAt()
    .setExpirationTime(getEnv().JWT_EXPIRES_IN)
    .sign(key())
  const { payload } = await jwtVerify(token, key(), { issuer: 'my-lists' })
  const exp = typeof payload.exp === 'number' ? payload.exp : 0
  return { token, expiresAt: new Date(exp * 1000).toISOString() }
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: 'my-lists' })
    if (typeof payload.sub !== 'string' || typeof payload.username !== 'string') return null
    return { id: payload.sub, username: payload.username }
  } catch {
    return null
  }
}
