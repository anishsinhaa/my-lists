import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { onSearchKey } from '@/features/search/searchControls'
import { SearchResults } from '@/features/search/SearchResults'
import { useGlobalSearch } from '@/features/search/useGlobalSearch'

export function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [tracked, setTracked] = useState('')
  const desktop = useMediaQuery('(min-width: 768px)')
  const { hits, ready } = useGlobalSearch(query, 8)
  const signature = hits.map((hit) => hit.id).join('|')
  if (signature !== tracked) {
    setTracked(signature)
    setActive(0)
  }
  const trimmed = query.trim()
  const shown = trimmed.length >= 2
  const count = hits.length + (shown ? 1 : 0)
  function choose(index: number) {
    if (index >= hits.length) {
      void navigate(`/search?q=${encodeURIComponent(trimmed)}`)
      return
    }
    document.getElementById(`search-hit-${index}`)?.click()
  }
  return (
    <div>
      <label className="block" htmlFor="global-search">
        <span className="sr-only">Search your lists</span>
        <span className="relative block">
          <Input
            id="global-search"
            autoFocus={desktop}
            className="h-14 pr-16 text-lg"
            inputMode="search"
            placeholder="Search movies, series, games..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (shown) onSearchKey(event, count, Math.min(active, count - 1), setActive, choose) }}
          />
          {query.length > 0 ? (
            <button type="button" className="absolute top-1/2 right-2 min-h-11 -translate-y-1/2 px-2 text-sm" onClick={() => setQuery('')}>
              Clear
            </button>
          ) : null}
        </span>
      </label>
      <p aria-live="polite" className="sr-only">{query.trim().length < 2 ? (ready ? 'Lists loaded' : 'Loading lists') : `${hits.length} results`}</p>
      {shown ? <SearchResults active={Math.min(active, Math.max(hits.length - 1, 0))} hits={hits} /> : null}
      {shown ? (
        <button
          type="button"
          aria-selected={active === hits.length}
          className={`mt-2 flex min-h-11 w-full items-center rounded-md px-2 text-left text-sm ${active === hits.length ? 'bg-(--surface)' : ''}`}
          onClick={() => choose(hits.length)}
        >
          See all results for “{trimmed}”
        </button>
      ) : null}
    </div>
  )
}
