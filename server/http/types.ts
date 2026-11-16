import type { AuthUser } from '../../src/types/auth.js'

export interface RequestContext {
  user?: AuthUser
}
