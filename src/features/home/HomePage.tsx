import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PosterImage } from '@/components/common/PosterImage'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { BRAND } from '@/config/branding'
import { Button } from '@/design/Button'
import { Rail } from '@/design/Rail'
import { StatusBadge } from '@/design/StatusBadge'
import { thumbnailUrl } from '@/design/archive'
import { useAuth } from '@/features/auth/AuthContext'
import { useLists } from '@/features/data/useLists'
import { usePicksVisibility } from '@/features/settings/useSettings'
import { LIST_KIND } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { GlobalSearch } from './GlobalSearch'
import { archiveStats, tonightPool, wallTiles } from './wall'

function salute(name: string): string {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return `${part}, ${name}`
}

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const picks = usePicksVisibility()
  const { data, isLoading, error, refetch } = useLists()
  const [spot, setSpot] = useState<MediaItem | null>(null)
  const tiles = useMemo(() => (data === undefined ? [] : wallTiles(data)), [data])
  const pool = useMemo(() => (data === undefined ? [] : tonightPool(data)), [data])
  const stats = data === undefined ? null : archiveStats(data)
  const collage = useMemo(() => {
    if (data === undefined) return []
    return Object.values(data.lists).flatMap((rows) => rows).flatMap((item) => (item.poster === null ? [] : [item])).slice(0, 18)
  }, [data])

  function pickTonight() {
    if (pool.length === 0) return
    const next = pool[Math.floor(Math.random() * pool.length)]
    setSpot(next ?? null)
  }

  if (isLoading) return <main className="p-4"><Skeletons /></main>
  if (data === undefined || stats === null) return <main className="p-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>

  return (
    <main>
      <section className="relative flex min-h-[70vh] flex-col justify-end overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute inset-0 grid grid-cols-6 gap-2 opacity-40 blur-sm" aria-hidden="true">
          {collage.map((item) => <img key={item.id} alt="" className="h-40 w-full object-cover" src={thumbnailUrl(item.poster, 'w185') ?? ''} />)}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#b08d5733,transparent_40%),linear-gradient(to_top,#100e0c,transparent_55%)]" />
        <div className="relative mx-auto w-full max-w-4xl space-y-5">
          <p className="font-['Fraunces',serif] text-5xl text-[#f4ead8] md:text-7xl" style={{ textShadow: '0 2px 0 #000, 0 -1px 0 #ffffff33' }}>{BRAND.name}</p>
          <p className="font-['EB_Garamond',serif] text-xl text-[#e7d7b8] italic">{BRAND.tagline}</p>
          <p className="text-sm text-[#cbbfa8]">{salute(user?.username ?? 'there')}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => void navigate('/lists')}>Open my lists</Button>
            <Button size="lg" variant="ghost" className="text-[#f4ead8]" disabled={pool.length === 0} onClick={pickTonight}>Pick for tonight</Button>
            {picks.any ? <Button size="lg" variant="ghost" className="text-[#f4ead8]" onClick={() => void navigate('/picks')}>Picks</Button> : null}
            <button type="button" disabled className="min-h-[52px] rounded-full border border-[#8c6b3a] bg-[#6b2b24] px-4 text-sm text-[#f4ead8]">Soon</button>
          </div>
          <GlobalSearch />
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 p-4 md:grid-cols-12">
        {tiles.map((tile) => (
          <Link key={tile.id} to={tile.href} className="rounded-md border border-(--brass)/40 bg-[#17130f]/80 p-3 md:col-span-4">
            <span className="font-['Cinzel',serif] text-sm tracking-wide">{tile.title}</span>
            <span className="mt-1 block text-xs text-(--ink-muted)">{tile.items.length}</span>
            <span className="mt-3 flex gap-2 overflow-hidden">
              {tile.items.slice(0, 4).map((item) => (
                <span key={item.id} className="w-14 shrink-0">
                  <PosterImage alt="" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w185')} title={item.title} />
                </span>
              ))}
            </span>
          </Link>
        ))}
        <div className="rounded-md border border-(--brass)/40 p-4 md:col-span-12">
          <p className="font-['Cinzel',serif] text-3xl tabular-nums">{stats.total}</p>
          <p className="text-sm text-(--ink-muted)">{stats.finished} finished{stats.average === null ? '' : ` · my average ${stats.average}`}</p>
        </div>
        <button type="button" className="rounded-md border border-(--brass)/40 p-4 text-left md:col-span-4" onClick={pickTonight}>
          <span className="font-['Cinzel',serif]">Pick for tonight</span>
          <span className="mt-1 block text-sm text-(--ink-muted)">{pool.length === 0 ? 'Nothing queued' : `${pool.length} waiting`}</span>
        </button>
      </section>
      <div className="md:hidden">
        {tiles.map((tile) => (
          <section key={`${tile.id}-rail`} className="px-4 pb-4">
            <h2 className="mb-2 font-['Cinzel',serif] text-sm">{tile.title}</h2>
            <Rail label={tile.title}>
              {tile.items.slice(0, 8).map((item) => (
                <Link key={item.id} to={tile.href} data-rail-card="true" className="w-36 shrink-0 snap-start">
                  <PosterImage alt="" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w185')} title={item.title} />
                </Link>
              ))}
            </Rail>
          </section>
        ))}
      </div>
      {spot === null ? null : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Pick for tonight">
          <div className="w-full max-w-sm space-y-3 rounded-md border border-(--brass) bg-[#14110e] p-4 text-[#f4ead8]">
            <PosterImage alt="" kind={LIST_KIND[spot.listId]} src={spot.poster} title={spot.title} />
            <h2 className="font-['Fraunces',serif] text-2xl">{spot.title}</h2>
            <StatusBadge listId={spot.listId} status={spot.status} />
            <p className="text-sm text-[#cbbfa8]">{spot.year ?? ''} {spot.creator ?? ''}</p>
            <div className="flex gap-2">
              <Button onClick={pickTonight}>Pick another</Button>
              <Button variant="ghost" className="text-[#f4ead8]" onClick={() => void navigate(`/lists/${spot.listId}?q=${encodeURIComponent(spot.title)}`)}>Open in list</Button>
              <Button variant="ghost" className="text-[#f4ead8]" onClick={() => setSpot(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
