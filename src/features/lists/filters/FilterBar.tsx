import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { externalRatingLabel } from '@/lib/rating'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { FILTER_CONFIG } from './filterConfig'
import { DEFAULT_QUERY, type ListQuery, type RatingBy } from './listQuery'

function frequent(values: Array<string | null>): string[] {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (value === null || value.length === 0) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([value]) => value)
}

function activeCount(query: ListQuery): number {
  return query.statuses.length + query.genres.length + (query.yearMin === null ? 0 : 1) + (query.yearMax === null ? 0 : 1) + (query.franchise ? 1 : 0) + (query.creator ? 1 : 0) + (query.platform ? 1 : 0) + (query.ratingMin === null ? 0 : 1)
}

export function FilterBar({ listId, items, query, onChange }: { listId: ListId; items: MediaItem[]; query: ListQuery; onChange: (query: ListQuery) => void }) {
  const [open, setOpen] = useState(false)
  const mobile = useMediaQuery('(max-width: 767px)')
  const config = FILTER_CONFIG[listId]
  const statuses = config.statuses.length > 0 ? config.statuses : frequent(items.map((item) => item.status))
  const genres = useMemo(() => frequent(items.flatMap((item) => item.genres)), [items])
  const franchises = useMemo(() => frequent(items.map((item) => item.franchise)), [items])
  const creators = useMemo(() => frequent(items.map((item) => item.creator)), [items])
  const platforms = useMemo(() => frequent(items.map((item) => item.platform)), [items])
  const toggleStatus = (status: string) => {
    const next = query.statuses.includes(status) ? query.statuses.filter((value) => value !== status) : [...query.statuses, status]
    onChange({ ...query, statuses: next })
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto">
        {statuses.map((status) => (
          <button key={status} type="button" className={`min-h-11 shrink-0 rounded-full border px-3 text-sm ${query.statuses.includes(status) ? 'bg-[var(--accent)] text-[var(--bg)]' : ''}`} onClick={() => toggleStatus(status)}>{status}</button>
        ))}
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>Filters {activeCount(query) > 0 ? activeCount(query) : ''}</Button>
        <Button type="button" variant="ghost" onClick={() => onChange({ ...DEFAULT_QUERY, view: query.view, sort: query.sort, dir: query.dir })}>Clear all</Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={mobile ? 'bottom' : 'right'}>
          <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
          <div className="space-y-4 overflow-y-auto p-4">
            {config.show.genre ? <OptionList label="Genre" options={genres} selected={query.genres} onToggle={(genre) => onChange({ ...query, genres: query.genres.includes(genre) ? query.genres.filter((value) => value !== genre) : [...query.genres, genre] })} /> : null}
            {config.show.year ? (
              <label className="block text-sm">Year
                <Slider max={2100} min={1880} value={[query.yearMin ?? 1880, query.yearMax ?? 2100]} onValueChange={(value) => onChange({ ...query, yearMin: value[0] ?? null, yearMax: value[1] ?? null })} />
              </label>
            ) : null}
            {config.show.franchise ? <OptionList label={config.franchiseLabel} options={franchises} selected={query.franchise === null ? [] : [query.franchise]} onToggle={(value) => onChange({ ...query, franchise: query.franchise === value ? null : value })} /> : null}
            {config.show.creator ? <OptionList label={config.creatorLabel} options={creators} selected={query.creator === null ? [] : [query.creator]} onToggle={(value) => onChange({ ...query, creator: query.creator === value ? null : value })} /> : null}
            {config.show.platform ? <OptionList label="Platform" options={platforms} selected={query.platform === null ? [] : [query.platform]} onToggle={(value) => onChange({ ...query, platform: query.platform === value ? null : value })} /> : null}
            {config.show.rating ? (
              <div className="space-y-2 text-sm">
                <p>Minimum rating {query.ratingMin ?? 0}</p>
                <Slider max={10} min={0} step={0.1} value={[query.ratingMin ?? 0]} onValueChange={(value) => onChange({ ...query, ratingMin: (value[0] ?? 0) === 0 ? null : value[0] ?? null })} />
                <ToggleGroup type="single" value={query.ratingBy} onValueChange={(value) => { if (value === 'best' || value === 'my' || value === 'external') onChange({ ...query, ratingBy: value as RatingBy }) }}>
                  <ToggleGroupItem value="best">Best</ToggleGroupItem>
                  <ToggleGroupItem value="my">Mine</ToggleGroupItem>
                  <ToggleGroupItem value="external">{externalRatingLabel(listId)}</ToggleGroupItem>
                </ToggleGroup>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function OptionList({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  const [needle, setNeedle] = useState('')
  const shown = options.filter((option) => option.toLowerCase().includes(needle.toLowerCase())).slice(0, 30)
  return (
    <div>
      <p className="text-sm">{label}</p>
      <input aria-label={`Search ${label}`} className="mt-1 w-full rounded-md border bg-transparent px-2 py-1" value={needle} onChange={(event) => setNeedle(event.target.value)} />
      <div className="mt-2 flex max-h-32 flex-wrap gap-1 overflow-y-auto">
        {shown.map((option) => (
          <button key={option} type="button" className={`rounded-full border px-2 py-1 text-xs ${selected.includes(option) ? 'bg-[var(--accent)] text-[var(--bg)]' : ''}`} onClick={() => onToggle(option)}>{option}</button>
        ))}
      </div>
    </div>
  )
}
