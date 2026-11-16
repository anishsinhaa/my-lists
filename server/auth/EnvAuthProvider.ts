import bcrypt from 'bcryptjs'
import type { AuthProvider, AuthUser } from './AuthProvider.js'

const DUMMY_HASH = '$2b$12$zigsia//994jEQvd8AlEG.HG8HoftXQK5eymy9HuJcIPFnSchQzEG'

export class EnvAuthProvider implements AuthProvider {
  private readonly username: string
  private readonly passwordHash: string

  constructor(username: string, passwordHash: string) {
    this.username = username
    this.passwordHash = passwordHash
  }

  async authenticate(username: string, password: string): Promise<AuthUser | null> {
    const userMatches = username === this.username
    const passwordMatches = await bcrypt.compare(password, userMatches ? this.passwordHash : DUMMY_HASH)
    if (!userMatches || !passwordMatches) return null
    return { id: 'local', username: this.username }
  }
}
