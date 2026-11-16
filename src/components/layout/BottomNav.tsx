import { NavLink } from 'react-router-dom'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const links = [
  { to: '/', label: 'Home' },
  { to: '/lists', label: 'My Lists' },
  { to: '/picks', label: 'Picks' },
]

export function BottomNav() {
  const mobile = useMediaQuery('(max-width: 767px)')
  if (!mobile) return null
  const picksOn = import.meta.env.VITE_FEATURE_PICKS === 'true'
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-[var(--surface)] pb-[env(safe-area-inset-bottom)]">
      {links.filter((link) => link.to !== '/picks' || picksOn).map((link) => (
        <NavLink key={link.to} to={link.to} className="flex min-h-11 flex-1 items-center justify-center text-sm">
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
