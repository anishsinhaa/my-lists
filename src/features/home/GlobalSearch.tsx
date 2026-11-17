import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { onSearchKey } from '@/features/search/searchControls'
import { SearchResults } from '@/features/search/SearchResults'
import { useGlobalSearch } from '@/features/search/useGlobalSearch'

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [tracked, setTracked] = useState('')
  const desktop = useMediaQuery('(min-width: 768px)')
  const { hits, ready } = useGlobalSearch(query)
  const signature = hits.map((hit) => hit.id).join('|')
  if (signature !== tracked) {
    setTracked(signature)
    setActive(0)
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault()
        document.getElementById('global-search')?.focus()
      }
    }
    const onAsk = () => document.getElementById('global-search')?.focus()
    window.addEventListener('keydown', onKey)
    window.addEventListener('ml:search', onAsk)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('ml:search', onAsk)
    }
  }, [])
  const shown = query.trim().length >= 2
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
            onKeyDown={(event) => { if (shown) onSearchKey(event, hits.length, Math.min(active, hits.length - 1), setActive, (index) => document.getElementById(`search-hit-${index}`)?.click()) }}
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
    </div>
  )
}
