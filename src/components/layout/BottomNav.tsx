import { Home, Library, Search, Settings, Sparkles } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useCanEdit } from '@/features/auth/AuthContext'
import { usePicksVisibility } from '@/features/settings/useSettings'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function BottomNav() {
  const mobile = useMediaQuery('(max-width: 767px)')
  const picks = usePicksVisibility()
  const canEdit = useCanEdit()
  const navigate = useNavigate()
  if (!mobile) return null
  const item = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] aria-[current=page]:text-(--brass)'
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 border-t border-(--brass)/40 bg-[#100e0c] pb-[env(safe-area-inset-bottom)]" aria-label="Primary">
      <NavLink to="/" end className={item}><Home className="size-5" aria-hidden="true" /> Home</NavLink>
      <NavLink to="/lists" className={item}><Library className="size-5" aria-hidden="true" /> Lists</NavLink>
      <button type="button" className={item} onClick={() => { void navigate('/'); window.dispatchEvent(new Event('ml:search')) }}><Search className="size-5" aria-hidden="true" /> Search</button>
      {canEdit && picks.any ? <NavLink to="/picks" className={item}><Sparkles className="size-5" aria-hidden="true" /> Picks</NavLink> : null}
      {canEdit ? <NavLink to="/settings" className={item}><Settings className="size-5" aria-hidden="true" /> Settings</NavLink> : null}
    </nav>
  )
}
