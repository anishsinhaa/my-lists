export type AuthRole = 'owner' | 'guest'

export const DEFAULT_ACCOUNT_ID = 'main'

export interface AuthUser {
  id: string
  username: string
  role: AuthRole
  accountId: string
}

export interface AuthSession {
  expiresAt: string
  user: AuthUser
}

export function canEdit(user: AuthUser | null | undefined, accountId: string): boolean {
  return user?.role === 'owner' && user.accountId === accountId
}
