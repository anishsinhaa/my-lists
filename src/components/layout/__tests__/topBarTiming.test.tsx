import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TopLoadingBar } from '../TopLoadingBar'
import { stepBar, type BarTiming } from '../topBarTiming'

vi.mock('@/hooks/useLoadingSignal', () => ({ useLoadingSignal: () => true }))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('top bar timing', () => {
  it('stays hidden for a short load and holds once shown', () => {
    let state: BarTiming = { startedAt: null, shownAt: null }
    let view = stepBar(state, true, 0)
    state = view
    view = stepBar(state, true, 100)
    expect(view.phase).toBe('hidden')
    view = stepBar(view, false, 100)
    expect(view.phase).toBe('hidden')

    state = { startedAt: null, shownAt: null }
    view = stepBar(state, true, 0)
    view = stepBar(view, true, 149)
    expect(view.phase).toBe('hidden')
    view = stepBar(view, false, 160)
    expect(view.phase).toBe('visible')
    view = stepBar(view, false, 449)
    expect(view.phase).toBe('visible')
    view = stepBar(view, false, 450)
    expect(view.phase).toBe('fading')
  })

  it('renders a progressbar once loading has lasted long enough', () => {
    vi.useFakeTimers()
    render(<TopLoadingBar />)
    expect(screen.queryByRole('progressbar')).toBeNull()
    act(() => { vi.advanceTimersByTime(150) })
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeTruthy()
  })
})
