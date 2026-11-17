import { Link, useSearchParams } from 'react-router-dom'
import { usePicksVisibility } from '@/features/settings/useSettings'
import { TAB_NAME, type PicksId } from '@/types/lists'
import { PickDeck } from './PickDeck'

export function PicksPage() {
  const [params, setParams] = useSearchParams()
  const picks = usePicksVisibility()
  const requested = params.get('tab')
  const picksId = picks.visible.find((id) => id === requested) ?? picks.visible[0]
  if (!picks.isSuccess && !picks.isError) return <main className="p-4">Loading settings.</main>
  if (picksId === undefined) {
    return (
      <main className="mx-auto max-w-lg space-y-3 p-4">
        <p>Picks are turned off.</p>
        <Link className="text-sm underline" to="/settings">Settings</Link>
      </main>
    )
  }
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        {picks.visible.map((id) => (
          <button key={id} type="button" className={`min-h-11 rounded-full border px-4 text-sm ${id === picksId ? 'bg-accent text-(--bg)' : ''}`} onClick={() => setParams({ tab: id })}>{TAB_NAME[id]}</button>
        ))}
      </div>
      <PickDeck key={picksId as PicksId} picksId={picksId} />
    </main>
  )
}
