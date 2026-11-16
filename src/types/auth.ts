export interface AuthUser {
  id: string
  username: string
}

export interface AuthSession {
  token: string
  expiresAt: string
  user: AuthUser
}
