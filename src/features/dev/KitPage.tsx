import { Plaque } from '@/design/Plaque'
import { Button } from '@/design/Button'
import { IconButton } from '@/design/IconButton'
import { Rail } from '@/design/Rail'
import { Ribbon, SegmentedBar, Stat } from '@/design/Stat'
import { StatusBadge } from '@/design/StatusBadge'
import { Search } from 'lucide-react'

const THEMES = ['home', 'movies', 'series', 'anime', 'games', 'books', 'other'] as const

export function KitPage() {
  return (
    <main className="space-y-8 p-6">
      {THEMES.map((theme) => (
        <section key={theme} data-theme={theme} className="space-y-3 rounded-md border p-4">
          <Plaque>{theme}</Plaque>
          <div className="flex flex-wrap gap-2">
            <Button>Brass</Button>
            <Button variant="ghost">Ghost</Button>
            <Button size="lg">Large</Button>
            <IconButton label="Search"><Search className="size-4" /></IconButton>
          </div>
          <StatusBadge listId="movies" status="In progress" />
          <Stat label="Titles" value={12} />
          <SegmentedBar segments={[{ id: 'a', label: 'Watching', count: 2 }, { id: 'b', label: 'Watched', count: 8 }]} />
          <Ribbon>Soon</Ribbon>
          <Rail label={`${theme} samples`}>
            {['One', 'Two', 'Three'].map((name) => <div key={name} className="h-24 w-40 shrink-0 snap-start border bg-(--surface) p-3">{name}</div>)}
          </Rail>
        </section>
      ))}
    </main>
  )
}
