import { Heart } from 'lucide-react'
import { PosterImage } from '@/components/common/PosterImage'
import { thumbnailUrl } from '@/design/archive'
import { displayTitle } from '@/lib/displayTitle'
import { externalRatingLabel } from '@/lib/rating'
import { LIST_KIND, type ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'

function addedDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date)
}

function cell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  if (text.length === 0 || text === '-' || text === '–' || text === '—') return ''
  return text
}

export function ListTable({ items, listId, onOpen }: { items: MediaItem[]; listId: ListId; onOpen: (item: MediaItem) => void }) {
  const creator = listId === 'books' ? 'Author' : 'Creator'
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-(--surface)">
          <tr>
            <th className="p-2">Poster</th>
            <th className="p-2">Title</th>
            <th className="p-2">Year</th>
            <th className="p-2">Date added</th>
            <th className="p-2">Genre</th>
            <th className="p-2">{creator}</th>
            <th className="p-2">Franchise</th>
            <th className="p-2">Status</th>
            <th className="p-2">My Rating</th>
            <th className="p-2">{externalRatingLabel(listId)}</th>
            <th className="p-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="cursor-pointer border-t border-border" onClick={() => onOpen(item)}>
              <td className="p-2">
                <PosterImage alt="" byline={item.creator ?? (item.year === null ? '' : String(item.year))} className="w-10" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w185')} title={displayTitle(item.title, item.year)} />
              </td>
              <td className="p-2">
                <span className="inline-flex items-center gap-1">
                  {item.favourite ? <Heart aria-label="Favourite" className="size-3.5 shrink-0 fill-(--accent) text-(--accent)" /> : null}
                  {displayTitle(item.title, item.year)}
                </span>
              </td>
              <td className="p-2">{cell(item.year)}</td>
              <td className="p-2">{item.dateAdded === null ? '—' : addedDay(item.dateAdded)}</td>
              <td className="p-2">{cell(item.genres.join(', '))}</td>
              <td className="p-2">{cell(item.creator)}</td>
              <td className="p-2">{cell(item.franchise)}</td>
              <td className="p-2">{cell(item.status)}</td>
              <td className="p-2">{cell(item.myRating)}</td>
              <td className="p-2">{cell(item.imdbRating)}</td>
              <td className="max-w-48 truncate p-2" title={item.notes}>{cell(item.notes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
