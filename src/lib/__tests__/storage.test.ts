import { beforeEach, describe, expect, it } from 'vitest'
import { readJson, writeJson } from '../storage.ts'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns the fallback when nothing is stored', () => {
    expect(readJson('missing', { n: 1 })).toEqual({ n: 1 })
  })

  it('round-trips json and ignores a bad payload', () => {
    writeJson('ml.test', { ok: true })
    expect(readJson('ml.test', { ok: false })).toEqual({ ok: true })
    localStorage.setItem('ml.test', '{')
    expect(readJson('ml.test', { ok: false })).toEqual({ ok: false })
  })
})
