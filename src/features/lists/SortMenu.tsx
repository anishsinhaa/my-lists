import { ArrowDownUp } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import type { SortKey } from './filters/listQuery'
import { hasFinishedColumn, sortOptions } from './sortOptions'

export function SortMenu({ listId, items, value, dir, onChange }: {
  listId: ListId
  items: MediaItem[]
  value: SortKey
  dir: 'asc' | 'desc'
  onChange: (sort: SortKey, dir: 'asc' | 'desc') => void
}) {
  const options = sortOptions(listId, hasFinishedColumn(listId, items))
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Sort" className="inline-flex size-11 items-center justify-center rounded-md border border-(--brass)/40">
          <ArrowDownUp aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((option) => (
          <DropdownMenuItem key={option.key} onClick={() => onChange(option.key, option.key === value ? (dir === 'asc' ? 'desc' : 'asc') : option.dir)}>
            {option.label}{option.key === value ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
