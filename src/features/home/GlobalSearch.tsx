import { useState } from 'react'
import { motion } from 'motion/react'
import { Input } from '@/components/ui/input'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { fadeUp } from '@/themes/motion'
import { useGlobalSearch } from '@/features/search/useGlobalSearch'
import { SearchResultRow } from './SearchResultRow'

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const desktop = useMediaQuery('(min-width: 768px)')
  const { hits, ready } = useGlobalSearch(query)
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
          />
          {query.length > 0 ? (
            <button type="button" className="absolute top-1/2 right-2 min-h-11 -translate-y-1/2 px-2 text-sm" onClick={() => setQuery('')}>
              Clear
            </button>
          ) : null}
        </span>
      </label>
      <p aria-live="polite" className="sr-only">{ready ? `${hits.length} results` : 'Loading lists'}</p>
      {query.trim().length >= 2 ? (
        <ul className="mt-3 space-y-1">
          {hits.map((hit, index) => (
            <motion.li key={hit.id} {...fadeUp} transition={{ delay: Math.min(index, 12) * 0.04 }}>
              <SearchResultRow hit={hit} />
            </motion.li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
