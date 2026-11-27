import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { RateDialog } from '../RateDialog'
import { StarRating } from '../StarRating'

beforeAll(() => {
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', Observer)
})

afterEach(cleanup)

describe('rate dialog', () => {
  it('saves a typed tenth, steps from the arrows, clamps, and can clear or cancel', () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const { unmount } = render(<RateDialog open value={null} onCancel={onCancel} onSave={onSave} />)
    const field = screen.getByRole('textbox', { name: 'Rating' })
    fireEvent.change(field, { target: { value: '7.3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith(7.3)
    unmount()
    onSave.mockClear()
    render(<RateDialog open value={null} onCancel={onCancel} onSave={onSave} />)
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(screen.getByRole('textbox', { name: 'Rating' }).getAttribute('value') === '0.1' || (screen.getByRole('textbox', { name: 'Rating' }) as HTMLInputElement).value === '0.1').toBe(true)
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect((screen.getByRole('textbox', { name: 'Rating' }) as HTMLInputElement).value).toBe('0.2')
    fireEvent.change(screen.getByRole('textbox', { name: 'Rating' }), { target: { value: '10.4' } })
    fireEvent.blur(screen.getByRole('textbox', { name: 'Rating' }))
    expect((screen.getByRole('textbox', { name: 'Rating' }) as HTMLInputElement).value).toBe('10.0')
    fireEvent.click(screen.getByRole('button', { name: 'Clear rating' }))
    expect(onSave).toHaveBeenCalledWith(null)
    onSave.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('star fill', () => {
  it('fills 30 percent of the eighth star for 7.3', () => {
    const { container } = render(<StarRating value={7.3} onChange={() => undefined} />)
    const star = container.querySelector('[data-star="8"] [style]')
    expect(star?.getAttribute('style') ?? '').toContain('30%')
  })
})
