import type { AuthUser } from '../../src/types/auth.js'

export type { AuthUser }

export interface AuthProvider {
  authenticate(username: string, password: string): Promise<AuthUser | null>
}
