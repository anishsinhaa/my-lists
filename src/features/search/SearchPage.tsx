import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { LIST_IDS, TAB_NAME } from '@/types/lists'
import { onSearchKey } from './searchControls'
import { SearchResults } from './SearchResults'
import { visibleGroupHits } from './searchIndex'
import { useGlobalSearch } from './useGlobalSearch'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const desktop = useMediaQuery('(min-width: 768px)')
  const { hits, ready } = useGlobalSearch(query, 300)
  const [expandedFor, setExpandedFor] = useState(query)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [active, setActive] = useState(0)
  const [tracked, setTracked] = useState('')
  if (expandedFor !== query) {
    setExpandedFor(query)
    setExpanded(new Set())
  }
  const shown = visibleGroupHits(hits, expanded)
  const signature = shown.map((hit) => hit.id).join('|')
  if (signature !== tracked) {
    setTracked(signature)
    setActive(0)
  }
  const trimmed = query.trim()
  const lists = new Set(hits.map((hit) => hit.listId)).size

  function setQuery(value: string) {
    const next = new URLSearchParams(params)
    if (value.length === 0) next.delete('q')
    else next.set('q', value)
    setParams(next, { replace: true })
  }

  return (
    <main className="edge py-6">
      <label className="block" htmlFor="search-page-input">
        <span className="sr-only">Search your lists</span>
        <Input
          id="search-page-input"
          autoFocus={desktop}
          className="h-14 text-lg"
          inputMode="search"
          placeholder="Search all your lists"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (trimmed.length < 2 || !ready) return
            onSearchKey(event, shown.length, Math.min(active, Math.max(shown.length - 1, 0)), setActive, (index) => document.getElementById(`page-hit-${index}`)?.click())
          }}
        />
      </label>
      <p aria-live="polite" className="sr-only">
        {trimmed.length < 2 ? 'Type at least 2 letters to search.' : ready ? `${hits.length} results in ${lists} lists` : 'Loading lists'}
      </p>
      {trimmed.length < 2 ? <p className="mt-6 text-(--ink-muted)">Type at least 2 letters to search.</p> : null}
      {trimmed.length >= 2 && !ready ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}
        </div>
      ) : null}
      {trimmed.length >= 2 && ready && hits.length === 0 ? (
        <div className="mt-6 space-y-3">
          <p>No matches for “{trimmed}”.</p>
          <div className="flex flex-wrap gap-2">
            {LIST_IDS.map((id) => <Link key={id} className="inline-flex min-h-11 items-center rounded-md border border-(--border) px-3 text-sm" to={`/${id}`}>{TAB_NAME[id]}</Link>)}
          </div>
        </div>
      ) : null}
      {trimmed.length >= 2 && ready && hits.length > 0 ? (
        <SearchResults
          active={Math.min(active, Math.max(shown.length - 1, 0))}
          expanded={expanded}
          grouped
          hits={hits}
          idPrefix="page-hit"
          query={trimmed}
          onShowAll={(listId) => setExpanded((current) => new Set(current).add(listId))}
        />
      ) : null}
    </main>
  )
}
