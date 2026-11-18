export interface AuthUser {
  id: string
  username: string
}

export interface AuthSession {
  expiresAt: string
  user: AuthUser
}
