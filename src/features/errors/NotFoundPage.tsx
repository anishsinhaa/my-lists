import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { BRAND } from '@/config/branding'
import { LIST_IDS, TAB_NAME } from '@/types/lists'

function decodedSegment(pathname: string): string {
  const segment = pathname.split('/').filter((part) => part.length > 0).pop() ?? ''
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export function NotFoundPage({ kind = 'page' }: { kind?: 'page' | 'list' }) {
  const location = useLocation()
  const params = useParams()
  const segment = decodedSegment(location.pathname)
  const listName = params.listId ?? segment
  useEffect(() => {
    const previous = document.title
    document.title = `Not found · ${BRAND.name}`
    return () => {
      document.title = previous
    }
  }, [])
  return (
    <main className="edge py-10">
      <h1 className="font-(--font-display) text-4xl">
        {kind === 'list' ? `No list called “${listName}”` : 'Page not found'}
      </h1>
      {kind === 'list' ? null : <p className="mt-3 text-(--ink-muted)">Nothing lives at <code>{location.pathname}</code>.</p>}
      {kind === 'list' ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {LIST_IDS.map((id) => (
            <Link key={id} to={`/${id}`} className="inline-flex min-h-11 items-center rounded-md border border-(--border) bg-(--surface) px-3 text-sm">{TAB_NAME[id]}</Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/" className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm text-(--bg)">Go home</Link>
          <Link to="/lists" className="inline-flex min-h-11 items-center rounded-md border border-(--border) bg-(--surface) px-4 text-sm">Open my lists</Link>
          {segment.length >= 2 ? <Link to={`/search?q=${encodeURIComponent(segment)}`} className="inline-flex min-h-11 items-center px-2 text-sm">Search for “{segment}”</Link> : null}
        </div>
      )}
    </main>
  )
}
