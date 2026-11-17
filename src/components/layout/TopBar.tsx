import { Clapperboard, Home, Library, RefreshCw, Search, Settings, Sparkles, User } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { BRAND } from '@/config/branding'
import { IconButton } from '@/design/IconButton'
import { useAuth } from '@/features/auth/AuthContext'
import { useLists } from '@/features/data/useLists'
import { usePicksVisibility } from '@/features/settings/useSettings'
import { useMediaQuery } from '@/hooks/useMediaQuery'

function focusSearch() {
  window.dispatchEvent(new Event('ml:search'))
}

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { refetch, isFetching } = useLists()
  const picks = usePicksVisibility()
  const mobile = useMediaQuery('(max-width: 767px)')
  const item = 'inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3 text-sm aria-[current=page]:border-(--brass)'
  return (
    <header className="sticky top-0 z-40 border-b border-(--brass)/30 bg-[#100e0c]/80 backdrop-blur-md">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-black focus:px-3 focus:py-2">Skip to content</a>
      <div className={`mx-auto flex max-w-6xl items-center gap-2 px-3 ${mobile ? 'h-14' : 'min-h-16'}`}>
        {!mobile && location.pathname !== '/' ? (
          <button type="button" className="inline-flex min-h-11 items-center gap-1 text-sm" onClick={() => void navigate(-1)}>Back</button>
        ) : null}
        <Link to="/" className="font-['Fraunces',serif] text-xl tracking-wide" style={{ textShadow: '0 1px 0 #000' }}>{BRAND.name}</Link>
        {mobile ? <span className="flex-1" /> : (
          <nav className="ml-4 flex flex-1 items-center gap-1" aria-label="Primary">
            <NavLink to="/" end className={item}><Home className="size-4" aria-hidden="true" /> Home</NavLink>
            <NavLink to="/lists" className={item}><Library className="size-4" aria-hidden="true" /> My Lists</NavLink>
            {picks.any ? <NavLink to="/picks" className={item}><Sparkles className="size-4" aria-hidden="true" /> Picks</NavLink> : null}
            <button type="button" className={item} onClick={focusSearch}><Search className="size-4" aria-hidden="true" /> Search <span className="text-xs text-(--ink-muted)">/</span></button>
          </nav>
        )}
        {!mobile ? <IconButton label="Settings" onClick={() => void navigate('/settings')}><Settings className="size-4" /></IconButton> : null}
        <IconButton label="Refresh" disabled={isFetching} onClick={() => void refetch()}><RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} /></IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Account" className="inline-flex size-11 items-center justify-center rounded-md border border-(--brass)/40"><User className="size-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Clapperboard className="sr-only" />
      </div>
    </header>
  )
}
