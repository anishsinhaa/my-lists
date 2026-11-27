import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { onSearchKey } from './searchControls'
import { SearchResults } from './SearchResults'
import { useGlobalSearch } from './useGlobalSearch'

function typingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function focusPageSearch(): boolean {
  const page = document.getElementById('search-page-input')
  const home = document.getElementById('global-search')
  const node = page instanceof HTMLInputElement ? page : home instanceof HTMLInputElement ? home : null
  if (node === null) return false
  node.focus()
  node.select()
  return true
}

export function SearchDock() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [tracked, setTracked] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const path = `${location.pathname}${location.search}`
  const seen = useRef(path)
  const { hits } = useGlobalSearch(query, 8)
  const signature = hits.map((hit) => hit.id).join('|')
  if (signature !== tracked) {
    setTracked(signature)
    setActive(0)
  }

  useEffect(() => {
    if (seen.current === path) return
    seen.current = path
    setOpen(false)
  }, [path])

  useEffect(() => {
    const onAsk = () => {
      if (focusPageSearch()) return
      setOpen((value) => !value)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      if (typingTarget(event.target)) return
      if (document.querySelector('[role=dialog]') !== null) return
      event.preventDefault()
      if (!focusPageSearch()) setOpen(true)
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
    const onPointerDown = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element) || panelRef.current?.contains(target) === true) return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      const swallow = (follow: Event) => {
        follow.preventDefault()
        follow.stopPropagation()
      }
      document.addEventListener('click', swallow, { capture: true, once: true })
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open])

  if (!open) return null
  const trimmed = query.trim()
  const shown = trimmed.length >= 2
  const count = hits.length + (shown ? 1 : 0)
  function choose(index: number) {
    if (index >= hits.length) {
      setOpen(false)
      void navigate(`/search?q=${encodeURIComponent(trimmed)}`)
      return
    }
    document.getElementById(`top-hit-${index}`)?.click()
  }
  return (
    <div ref={panelRef} className="fixed top-(--app-bar) left-1/2 z-40 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-md border border-(--brass)/40 bg-(--bg) p-3 text-(--ink) shadow-xl">
      <label className="block" htmlFor="top-search">
        <span className="sr-only">Search your lists</span>
        <Input
          id="top-search"
          className="h-11"
          inputMode="search"
          placeholder="Search movies, series, games..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (shown) onSearchKey(event, count, Math.min(active, count - 1), setActive, choose) }}
        />
      </label>
      {shown ? <SearchResults active={Math.min(active, Math.max(hits.length - 1, 0))} hits={hits} idPrefix="top-hit" /> : null}
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
