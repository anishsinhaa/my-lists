import { SignJWT, jwtVerify } from 'jose'
import { DEFAULT_ACCOUNT_ID, type AuthRole, type AuthUser } from '../../src/types/auth.js'
import { getEnv } from '../config/env.js'

function key(): { kty: 'oct'; k: string } {
  return { kty: 'oct', k: Buffer.from(getEnv().JWT_SECRET).toString('base64url') }
}

function isRole(value: unknown): value is AuthRole {
  return value === 'owner' || value === 'guest'
}

export async function signToken(user: AuthUser): Promise<{ token: string; expiresAt: string }> {
  const expiresIn = user.role === 'guest' ? getEnv().GUEST_EXPIRES_IN : getEnv().JWT_EXPIRES_IN
  const token = await new SignJWT({ username: user.username, role: user.role, acct: user.accountId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuer('my-lists')
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key())
  const { payload } = await jwtVerify(token, key(), { issuer: 'my-lists' })
  const exp = typeof payload.exp === 'number' ? payload.exp : 0
  return { token, expiresAt: new Date(exp * 1000).toISOString() }
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: 'my-lists' })
    if (typeof payload.sub !== 'string' || typeof payload.username !== 'string') return null
    const accountId = typeof payload.acct === 'string' && payload.acct.length > 0 ? payload.acct : DEFAULT_ACCOUNT_ID
    let role: AuthRole
    if (payload.role === undefined) {
      if (payload.sub !== 'local') return null
      role = 'owner'
    } else if (isRole(payload.role)) {
      role = payload.role
    } else {
      return null
    }
    if (role === 'guest' && getEnv().GUEST_MODE !== 'true') return null
    return { id: payload.sub, username: payload.username, role, accountId }
  } catch {
    return null
  }
}
