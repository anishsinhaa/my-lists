import { ArrowLeft, Eye, Home, Library, RefreshCw, Search, Settings, Sparkles, User } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { BRAND } from '@/config/branding'
import { IconButton } from '@/design/IconButton'
import { LogoMark } from '@/design/LogoMark'
import { useAuth } from '@/features/auth/AuthContext'
import { useLists } from '@/features/data/useLists'
import { usePicksVisibility } from '@/features/settings/useSettings'

function focusSearch() {
  window.dispatchEvent(new Event('ml:search'))
}

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, canEdit } = useAuth()
  const { refetch, isFetching } = useLists()
  const picks = usePicksVisibility()
  const inner = location.pathname !== '/'
  const item = 'inline-flex min-h-11 items-center gap-1.5 border-b-2 border-transparent px-2 text-sm whitespace-nowrap xl:px-3 aria-[current=page]:border-[#b08d57]'
  return (
    <header className="app-topbar sticky top-0 z-40 w-full overflow-visible border-b border-(--brass)/30 bg-[#100e0c]/80 backdrop-blur-md">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-black focus:px-3 focus:py-2">Skip to content</a>
      <div className="app-topbar-row edge grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center gap-1 justify-self-start">
          {inner ? (
            <button type="button" aria-label="Back" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[#f4ead8] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#b08d57]" onClick={() => void navigate(-1)}>
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          ) : null}
          <Link to="/" className="flex min-w-0 items-center gap-2 py-1 font-['Fraunces',serif] text-[clamp(1.05rem,2vw,1.35rem)] leading-tight tracking-wide text-[#f4ead8]" style={{ textShadow: '0 1px 0 #000' }}>
            <LogoMark size={28} className="size-6 md:size-7" />
            <span className="truncate">{BRAND.name}</span>
          </Link>
        </div>
        <nav aria-label="Primary" className="justify-self-center">
          <div className="hidden items-center md:flex">
            <NavLink to="/" end className={item}><Home className="size-4" aria-hidden="true" /> Home</NavLink>
            <NavLink to="/lists" className={item}><Library className="size-4" aria-hidden="true" /> My Lists</NavLink>
            {canEdit && picks.any ? <NavLink to="/picks" className={item}><Sparkles className="size-4" aria-hidden="true" /> Picks</NavLink> : null}
            <button type="button" className={item} onClick={focusSearch}><Search className="size-4" aria-hidden="true" /> Search <span className="text-xs text-(--ink-muted)">/</span></button>
          </div>
        </nav>
        <div className="flex items-center justify-end gap-1 justify-self-end">
          {canEdit ? null : (
            <span className="inline-flex min-h-8 items-center gap-1 rounded-full border border-(--brass)/40 px-2 text-xs whitespace-nowrap text-[#f4ead8]">
              <Eye aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">Guest · view only</span>
              <span className="sm:hidden">View only</span>
              <button type="button" className="underline" onClick={logout}>Sign in</button>
            </span>
          )}
          {canEdit ? <IconButton label="Settings" onClick={() => void navigate('/settings')}><Settings className="size-4" /></IconButton> : null}
          <IconButton label="Refresh" disabled={isFetching} onClick={() => void refetch()}><RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} /></IconButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Account" className="inline-flex size-11 items-center justify-center rounded-md border border-(--brass)/40 text-[#f4ead8]"><User className="size-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={logout}>{canEdit ? 'Log out' : 'Sign in as owner'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
