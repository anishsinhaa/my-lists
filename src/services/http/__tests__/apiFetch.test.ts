import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from '../apiFetch'

afterEach(() => vi.unstubAllGlobals())

describe('apiFetch', () => {
  it('turns an HTML 504 into an upstream error', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('<html>timeout</html>', { status: 504, headers: { 'content-type': 'text/html' } })))
    await expect(apiFetch('/api/lists')).rejects.toBeInstanceOf(ApiError)
    await expect(apiFetch('/api/lists')).rejects.toMatchObject({ code: 'upstream_error', status: 504, message: 'The server timed out. Try again.' })
  })
})
