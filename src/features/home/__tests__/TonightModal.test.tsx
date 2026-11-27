import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, type ImgHTMLAttributes, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { LIST_IDS, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { DEFAULT_QUERY } from '@/features/lists/filters/listQuery'
import { CategoryView } from '@/features/lists/CategoryView'
import { TonightModal } from '../TonightModal'
import { TonightReel } from '../TonightReel'

vi.mock('motion/react', () => {
  function MotionDiv({ children, onAnimationComplete, ...props }: { children?: ReactNode; onAnimationComplete?: () => void } & Record<string, unknown>) {
    const spinning = props['data-spinning']
    useEffect(() => {
      if (spinning !== 'true') return undefined
      const timer = window.setTimeout(() => onAnimationComplete?.(), 1800)
      return () => window.clearTimeout(timer)
    }, [onAnimationComplete, spinning])
    return <div>{children}</div>
  }
  function MotionImg({ alt, src, className, onLoad, onError }: ImgHTMLAttributes<HTMLImageElement>) {
    return <img alt={alt ?? ''} className={className} src={src} onError={onError} onLoad={onLoad} />
  }
  return {
    AnimatePresence: ({ children }: { children?: ReactNode }) => children,
    motion: { div: MotionDiv, img: MotionImg },
  }
})

function item(partial: Partial<MediaItem> & Pick<MediaItem, 'id' | 'listId' | 'title' | 'status'>): MediaItem {
  return {
    titleKey: partial.title.toLowerCase(), statusGroup: 'planned', year: 2012, genres: ['Thriller'], why: 'Because', notes: '', updatedAt: null,
    poster: null, creator: 'Ben Affleck', franchise: null, myRating: null, imdbRating: null, platform: null, extra: {}, ...partial,
    dateAdded: partial.dateAdded ?? null,
    favourite: partial.favourite ?? false,
  }
}

function lists(rows: MediaItem[]): Record<ListId, MediaItem[]> {
  const blank = Object.fromEntries(LIST_IDS.map((id) => [id, [] as MediaItem[]])) as Record<ListId, MediaItem[]>
  for (const row of rows) blank[row.listId] = [...blank[row.listId], row]
  return blank
}

function Location() {
  const location = useLocation()
  return <p>{location.pathname}{location.search}</p>
}

beforeEach(() => {
  localStorage.clear()
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
})

afterEach(() => cleanup())

describe('Tonight modal', () => {
  const rows = lists([
    item({ id: 'movies:argo:2012', listId: 'movies', title: 'Argo', status: 'Want to' }),
    item({ id: 'movies:heat:1995', listId: 'movies', title: 'Heat', status: 'Watched', year: 1995, creator: 'Michael Mann' }),
    item({ id: 'movies:short:2000', listId: 'movies', title: 'Rush', status: 'Must watch', year: 2013, genres: ['Drama'], extra: { runtime: '80 min' }, creator: 'Ron Howard' }),
  ])

  function open() {
    return render(<MemoryRouter><TonightModal lists={rows} onClose={() => undefined} /></MemoryRouter>)
  }

  it('starts on Movies with the queue statuses and a match count', () => {
    open()
    expect(screen.getByRole('dialog').className).toContain('md:h-[min(88dvh,640px)]')
    expect(screen.getByRole('dialog').className).toContain('md:w-[32rem]')
    expect(screen.getByRole('button', { name: 'Movies' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Must watch' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Want to watch' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('2 to pick from')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Short/ }).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: /Short/ }))
    expect(screen.getByText('1 to pick from')).toBeTruthy()
  })

  it('picks without repeating, then can change filters and open the list', () => {
    const random = Math.random
    Math.random = () => 0
    vi.useFakeTimers()
    const finishSpin = () => act(() => { vi.advanceTimersByTime(1800) })
    try {
      render(
        <MemoryRouter>
          <Location />
          <TonightModal lists={rows} onClose={() => undefined} />
        </MemoryRouter>,
      )
      fireEvent.click(screen.getByRole('button', { name: 'All' }))
      fireEvent.click(screen.getByRole('button', { name: 'Pick' }))
      finishSpin()
      expect(screen.getByRole('heading', { name: 'Argo' })).toBeTruthy()
      expect(screen.getByText('About')).toBeTruthy()
      expect(screen.getByText('Because')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Pick another' }))
      finishSpin()
      expect(screen.getByRole('heading', { name: 'Heat' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Change filters' }))
      expect(screen.getByText('3 to pick from')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Pick' }))
      finishSpin()
      fireEvent.click(screen.getByRole('button', { name: 'Open in list' }))
      expect(screen.getByText(/\/lists\/movies\?item=movies(%3A|:)argo(%3A|:)2012/)).toBeTruthy()
      expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1)
      expect(screen.getByRole('dialog').className).toContain('md:h-[min(88dvh,640px)]')
      expect(screen.getByRole('dialog').className).toContain('md:w-[32rem]')
    } finally {
      vi.useRealTimers()
      Math.random = random
    }
  })
})

describe('tonight reel', () => {
  it('shows every frame with the winner last and lands once', () => {
    vi.useFakeTimers()
    const land = vi.fn()
    const frames = [
      item({ id: 'movies:heat:1995', listId: 'movies', title: 'Heat', status: 'Watched' }),
      item({ id: 'movies:argo:2012', listId: 'movies', title: 'Argo', status: 'Want to' }),
    ]
    try {
      render(<TonightReel frames={frames} spinning onLand={land} />)
      const titles = screen.getAllByText(/Heat|Argo/).map((node) => node.textContent)
      expect(titles.at(-1)).toContain('Argo')
      act(() => { vi.advanceTimersByTime(1800) })
      expect(land).toHaveBeenCalledTimes(1)
      expect(land).toHaveBeenCalledWith(expect.objectContaining({ id: 'movies:argo:2012' }))
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('opening a picked item', () => {
  it('opens that item’s detail modal from the list url', () => {
    const row = item({ id: 'movies:argo:2012', listId: 'movies', title: 'Argo', status: 'Want to' })
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CategoryView items={[row]} listId="movies" openItemId={row.id} query={{ ...DEFAULT_QUERY, view: 'grid' }} onChange={() => undefined} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('heading', { name: 'Argo' })).toBeTruthy()
    expect(screen.getAllByText('About').length).toBeGreaterThan(0)
  })
})
