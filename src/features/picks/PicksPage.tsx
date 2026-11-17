import { useSearchParams } from 'react-router-dom'
import { PICKS_IDS, TAB_NAME, type PicksId } from '@/types/lists'
import { PickDeck } from './PickDeck'

export function PicksPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const picksId = PICKS_IDS.find((id) => id === requested) ?? 'movies-picks'
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <div className="grid grid-cols-3 gap-2">
        {PICKS_IDS.map((id) => (
          <button key={id} type="button" className={`min-h-11 rounded-full border text-sm ${id === picksId ? 'bg-[var(--accent)] text-[var(--bg)]' : ''}`} onClick={() => setParams({ tab: id })}>{TAB_NAME[id]}</button>
        ))}
      </div>
      <PickDeck key={picksId as PicksId} picksId={picksId} />
    </main>
  )
}
