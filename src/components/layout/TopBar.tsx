import { Settings } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/AuthContext'
import { useLists } from '@/features/data/useLists'

const TITLES: Record<string, string> = { '/': 'Home', '/lists': 'My Lists', '/picks': 'Picks', '/settings': 'Settings', '/_theme': 'Themes' }

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { refetch, isFetching } = useLists()
  const title = TITLES[location.pathname] ?? 'My Lists'
  return (
    <header className="flex items-center gap-2 border-b px-3 py-2">
      {location.pathname !== '/' ? <Button type="button" variant="ghost" onClick={() => void navigate(-1)}>Back</Button> : null}
      <h1 className="flex-1 font-(--font-display) text-lg">{title}</h1>
      <Button variant="ghost" size="icon" asChild>
        <Link to="/settings" aria-label="Settings"><Settings /></Link>
      </Button>
      <Button type="button" variant="outline" disabled={isFetching} onClick={() => void refetch()}>Refresh</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button type="button" variant="ghost">Account</Button></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
