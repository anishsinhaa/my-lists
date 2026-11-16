import { getEnv } from '../config/env.js'
import type { AuthProvider } from './AuthProvider.js'
import { EnvAuthProvider } from './EnvAuthProvider.js'

export type { AuthProvider, AuthUser } from './AuthProvider.js'
export { EnvAuthProvider } from './EnvAuthProvider.js'

export function getAuthProvider(): AuthProvider {
  const env = getEnv()
  return new EnvAuthProvider(env.AUTH_USERNAME, env.AUTH_PASSWORD_HASH)
}
