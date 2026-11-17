import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { externalRatingLabel } from '@/lib/rating'
import type { ListId } from '@/types/lists'
import type { SortKey } from './filters/listQuery'

export function SortMenu({ listId, value, dir, onChange }: { listId: ListId; value: SortKey; dir: 'asc' | 'desc'; onChange: (sort: SortKey, dir: 'asc' | 'desc') => void }) {
  const options: Array<{ key: SortKey; label: string }> = [
    { key: 'title', label: 'Title' },
    { key: 'year', label: 'Year' },
    { key: 'rating', label: 'Rating (best)' },
    { key: 'myRating', label: 'My Rating' },
    { key: 'imdbRating', label: `${externalRatingLabel(listId)} Rating` },
    { key: 'updated', label: 'Updated' },
    { key: 'status', label: 'Status' },
  ]
  const current = options.find((option) => option.key === value)?.label ?? 'Updated'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button type="button" variant="outline">{current} {dir === 'desc' ? '↓' : '↑'}</Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((option) => (
          <DropdownMenuItem key={option.key} onClick={() => onChange(option.key, option.key === value && dir === 'desc' ? 'asc' : 'desc')}>{option.label}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
