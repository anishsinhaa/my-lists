import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/features/auth/AuthContext'
import { GlobalSearch } from './GlobalSearch'

const picksOn = import.meta.env.VITE_FEATURE_PICKS === 'true'

export function HomePage() {
  const { user } = useAuth()
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <div>
        <p className="font-[var(--font-display)] text-3xl">My Lists</p>
        <p className="text-[var(--ink-muted)]">Hello, {user?.username ?? 'there'}</p>
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
        {picksOn ? <Link className="text-sm underline" to="/picks">Picks</Link> : null}
      </div>
    </main>
  )
}
