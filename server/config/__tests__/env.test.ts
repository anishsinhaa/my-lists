import { describe, expect, it } from 'vitest'
import { parseEnv } from '../env.js'

const secret = 'short-secret'

describe('parseEnv', () => {
  it('lists invalid variable names and never their values', () => {
    expect(() => parseEnv({ JWT_SECRET: secret })).toThrow(/AUTH_USERNAME/)
    try {
      parseEnv({ JWT_SECRET: secret })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      expect(message).toContain('JWT_SECRET')
      expect(message).toContain('GOOGLE_SHEET_ID')
      expect(message).not.toContain(secret)
    }
  })
})
