import type { ListId } from '@/types/lists'
import { SMART_VIEWS } from './smartViews'

export function SmartViewChips({ listId, value, onChange }: { listId: ListId; value: string | null; onChange: (id: string | null) => void }) {
  const views = SMART_VIEWS[listId]
  if (views.length === 0) return null
  return (
    <div className="flex gap-2 overflow-x-auto">
      {views.map((view) => (
        <button key={view.id} type="button" className={`min-h-11 shrink-0 rounded-full border px-3 text-sm ${value === view.id ? 'bg-accent text-(--bg)' : ''}`} onClick={() => onChange(value === view.id ? null : view.id)}>{view.label}</button>
      ))}
    </div>
  )
}
