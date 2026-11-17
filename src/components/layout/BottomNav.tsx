import { NavLink } from 'react-router-dom'
import { usePicksVisibility } from '@/features/settings/useSettings'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const links = [
  { to: '/', label: 'Home' },
  { to: '/lists', label: 'My Lists' },
  { to: '/picks', label: 'Picks' },
]

export function BottomNav() {
  const mobile = useMediaQuery('(max-width: 767px)')
  const picks = usePicksVisibility()
  if (!mobile) return null
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-(--surface) pb-[env(safe-area-inset-bottom)]">
      {links.filter((link) => link.to !== '/picks' || picks.any).map((link) => (
        <NavLink key={link.to} to={link.to} className="flex min-h-11 flex-1 items-center justify-center text-sm">
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
