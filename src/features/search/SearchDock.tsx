import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { onSearchKey } from './searchControls'
import { SearchResults } from './SearchResults'
import { useGlobalSearch } from './useGlobalSearch'

export function SearchDock() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [tracked, setTracked] = useState('')
  const { hits } = useGlobalSearch(query)
  const signature = hits.map((hit) => hit.id).join('|')
  if (signature !== tracked) {
    setTracked(signature)
    setActive(0)
  }

  useEffect(() => {
    const onAsk = () => {
      if (document.getElementById('global-search')) return
      setOpen(true)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (document.getElementById('global-search')) return
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener('ml:search', onAsk)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('ml:search', onAsk)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    document.getElementById('top-search')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.querySelector('[role=dialog]') === null) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  const shown = query.trim().length >= 2
  return (
    <div className="fixed top-(--app-bar) left-1/2 z-40 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-md border border-(--brass)/40 bg-(--bg) p-3 text-(--ink) shadow-xl">
      <label className="block" htmlFor="top-search">
        <span className="sr-only">Search your lists</span>
        <Input
          id="top-search"
          className="h-11"
          inputMode="search"
          placeholder="Search movies, series, games..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (shown) onSearchKey(event, hits.length, Math.min(active, hits.length - 1), setActive, (index) => document.getElementById(`top-hit-${index}`)?.click()) }}
        />
      </label>
      {shown ? <SearchResults active={Math.min(active, Math.max(hits.length - 1, 0))} hits={hits} idPrefix="top-hit" /> : null}
    </div>
  )
}
