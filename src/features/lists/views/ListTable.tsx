import { externalRatingLabel } from '@/lib/rating'
import type { ListId } from '@/types/lists'
import type { MediaItem } from '@/types/media'

function cell(value: string | number | null) {
  return value === null || value === '' ? '–' : value
}

export function ListTable({ items, listId }: { items: MediaItem[]; listId: ListId }) {
  const label = `${externalRatingLabel(listId)} Rating`
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[var(--surface)]">
          <tr>
            <th className="p-2">Title</th>
            <th className="p-2">Status</th>
            <th className="p-2">Year</th>
            <th className="hidden p-2 sm:table-cell">Genre</th>
            <th className="hidden p-2 sm:table-cell">Creator</th>
            <th className="p-2">My Rating</th>
            <th className="p-2">{label}</th>
            <th className="hidden p-2 sm:table-cell">Updated</th>
            {listId === 'games' ? <th className="p-2">Platform</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-[var(--border)]">
              <td className="p-2">{item.title}</td>
              <td className="p-2">{cell(item.status)}</td>
              <td className="p-2">{cell(item.year)}</td>
              <td className="hidden p-2 sm:table-cell">{cell(item.genres.join(', '))}</td>
              <td className="hidden p-2 sm:table-cell">{cell(item.creator)}</td>
              <td className="p-2">{cell(item.myRating)}</td>
              <td className="p-2">{cell(item.imdbRating)}</td>
              <td className="hidden p-2 sm:table-cell">{cell(item.updatedAt)}</td>
              {listId === 'games' ? <td className="p-2">{cell(item.platform)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
