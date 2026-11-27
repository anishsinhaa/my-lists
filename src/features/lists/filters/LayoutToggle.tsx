import { LayoutGrid, Rows3, Table2, type LucideIcon } from 'lucide-react'
import type { ListQuery } from './listQuery'

const OPTIONS: ReadonlyArray<readonly [ListQuery['view'], LucideIcon, string, string]> = [
  ['shelves', Rows3, 'Shelves', 'Shelves view'],
  ['grid', LayoutGrid, 'Grid', 'Grid view'],
  ['table', Table2, 'Table', 'Table view'],
]

export function LayoutToggle({ view, onChange }: { view: ListQuery['view']; onChange: (partial: Partial<ListQuery>) => void }) {
  return (
    <div role="radiogroup" aria-label="Layout" className="flex gap-1">
      {OPTIONS.map(([value, Icon, name, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={view === value}
          aria-label={label}
          className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border px-2 text-sm md:min-h-9 md:min-w-9 ${view === value ? 'border-transparent bg-accent text-(--bg)' : 'border-(--brass)/40 bg-(--surface)'}`}
          onClick={() => { if (view !== value) onChange({ view: value, group: value === 'shelves' ? 'status' : 'none' }) }}
        >
          <Icon aria-hidden="true" className="size-4" />
          <span className="sr-only md:not-sr-only">{name}</span>
        </button>
      ))}
    </div>
  )
}
