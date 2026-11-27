import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PosterImage } from '../PosterImage'

afterEach(cleanup)

function load(img: HTMLImageElement, width: number) {
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: width })
  fireEvent.load(img)
}

describe('PosterImage', () => {
  it('shows the title when there is no source', () => {
    render(<PosterImage alt="" src={null} title="Argo" />)
    expect(screen.getByText('Argo')).toBeTruthy()
    expect(document.querySelector('img')).toBeNull()
  })

  it('treats a 1 pixel image as a missing cover', () => {
    const { container } = render(<PosterImage alt="" src="https://covers.openlibrary.org/b/id/1-L.jpg" title="Dune" />)
    const img = container.querySelector('img')
    if (!(img instanceof HTMLImageElement)) throw new Error('missing image')
    expect(screen.getByText('Dune')).toBeTruthy()
    load(img, 1)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Dune')).toBeTruthy()
  })

  it('keeps the fallback visible while a real cover is still loading', () => {
    const { container } = render(<PosterImage alt="" src="https://img.example/heat.jpg" title="Heat" />)
    expect(screen.getByText('Heat')).toBeTruthy()
    expect(container.querySelector('img')).toBeTruthy()
  })
})
