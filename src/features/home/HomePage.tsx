import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { useAuth } from '@/features/auth/AuthContext'
import { listCounts } from '@/features/data/selectors'
import { useLists } from '@/features/data/useLists'
import { usePicksVisibility } from '@/features/settings/useSettings'
import { LIST_IDS, TAB_NAME } from '@/types/lists'
import { GlobalSearch } from './GlobalSearch'

export function HomePage() {
  const { user } = useAuth()
  const picks = usePicksVisibility()
  const { data, isLoading, error, refetch } = useLists()
  const counts = data === undefined ? null : listCounts(data)
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <div>
        <p className="font-(--font-display) text-3xl">My Lists</p>
        <p className="text-(--ink-muted)">Hello, {user?.username ?? 'there'}</p>
      </div>
      <GlobalSearch />
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild><Link to="/lists">My Lists</Link></Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button disabled aria-disabled="true" type="button">Add</Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Coming in phase 2</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {picks.any ? <Link className="text-sm underline" to="/picks">Picks</Link> : null}
      </div>
      {isLoading ? <Skeletons /> : null}
      {counts === null && !isLoading ? <ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /> : null}
      {counts !== null ? (
        <ul className="grid grid-cols-2 gap-3">
          {LIST_IDS.map((id) => (
            <li key={id}>
              <Link className="block rounded-xl border bg-(--surface) p-4" to={`/lists/${id}`}>
                <span className="block text-sm text-(--ink-muted)">{TAB_NAME[id]}</span>
                <span className="text-2xl font-semibold">{counts[id]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  )
}
