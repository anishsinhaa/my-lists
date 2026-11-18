import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import { PosterImage } from '@/components/common/PosterImage'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { BRAND } from '@/config/branding'
import { Button } from '@/design/Button'
import { LogoMark } from '@/design/LogoMark'
import { Rail } from '@/design/Rail'
import { thumbnailUrl } from '@/design/archive'
import { useAuth } from '@/features/auth/AuthContext'
import { displayTitle } from '@/lib/displayTitle'
import { useLists } from '@/features/data/useLists'
import { usePicksVisibility } from '@/features/settings/useSettings'
import { DUR, EASE, fadeIn } from '@/themes/motion'
import { LIST_IDS, LIST_KIND } from '@/types/lists'
import { GlobalSearch } from './GlobalSearch'
import { TonightModal } from './TonightModal'
import { readTonight, tonightMatches, type TonightChoice } from './tonight'
import { archiveStats, wallTiles } from './wall'

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
  const [tonight, setTonight] = useState(false)
  const [choice, setChoice] = useState<TonightChoice | null>(null)
  const tiles = useMemo(() => (data === undefined ? [] : wallTiles(data)), [data])
  const pool = useMemo(() => (data === undefined ? [] : tonightMatches(data.lists, choice ?? readTonight(data.lists))), [choice, data])
  const archiveSize = data === undefined ? 0 : LIST_IDS.reduce((sum, id) => sum + data.lists[id].length, 0)
  const stats = data === undefined ? null : archiveStats(data)
  const collage = useMemo(() => {
    if (data === undefined) return []
    return Object.values(data.lists).flatMap((rows) => rows).flatMap((item) => (item.poster === null ? [] : [item])).slice(0, 18)
  }, [data])

  if (isLoading) return <main className="edge py-4"><Skeletons /></main>
  if (data === undefined || stats === null) return <main className="edge py-4"><ErrorState message={error instanceof Error ? error.message : 'Could not load lists'} onRetry={() => void refetch()} /></main>

  return (
    <main>
      <section className="edge relative flex min-h-[70vh] w-full flex-col justify-end overflow-hidden py-10">
        <div className="pointer-events-none absolute inset-0 grid grid-cols-6 gap-2 opacity-40 blur-sm" aria-hidden="true">
          {collage.map((item) => <img key={item.id} alt="" className="h-40 w-full object-cover" src={thumbnailUrl(item.poster, 'w185') ?? ''} />)}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#b08d5733,transparent_40%),linear-gradient(to_top,#100e0c,transparent_55%)]" />
        <div className="relative mx-auto w-full max-w-4xl space-y-5">
          <motion.div className="w-fit" initial={fadeIn.initial} animate={fadeIn.animate} transition={{ duration: DUR.slow, ease: EASE.emphasized }}>
            <LogoMark size={88} className="size-[4.5rem] drop-shadow-[0_0_18px_rgba(215,181,106,0.55)] sm:size-[5.5rem]" />
          </motion.div>
          <p className="font-['Fraunces',serif] text-5xl text-[#f4ead8] md:text-7xl" style={{ textShadow: '0 2px 0 #000, 0 -1px 0 #ffffff33' }}>{BRAND.name}</p>
          <p className="font-['EB_Garamond',serif] text-xl text-[#e7d7b8] italic">{BRAND.tagline}</p>
          <p className="text-sm text-[#cbbfa8]">{salute(user?.username ?? 'there')}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => void navigate('/lists')}>Open my lists</Button>
            <Button size="lg" variant="ghost" className="text-[#f4ead8]" disabled={archiveSize === 0} onClick={() => setTonight(true)}>Pick for tonight</Button>
            {picks.any ? <Button size="lg" variant="ghost" className="text-[#f4ead8]" onClick={() => void navigate('/picks')}>Picks</Button> : null}
            <button type="button" disabled className="min-h-13 rounded-full border border-[#8c6b3a] bg-[#6b2b24] px-4 text-sm text-[#f4ead8]">Soon</button>
          </div>
          <GlobalSearch />
        </div>
      </section>
      <section className="edge grid w-full gap-4 py-4 md:grid-cols-12">
        {tiles.map((tile) => (
          <Link key={tile.id} to={tile.href} className="rounded-md border border-(--brass)/40 bg-[#17130f]/80 p-3 md:col-span-4">
            <span className="font-['Cinzel',serif] text-sm tracking-wide">{tile.title}</span>
            <span className="mt-1 block text-xs text-(--ink-muted)">{tile.items.length}</span>
            <span className="mt-3 flex gap-2 overflow-hidden">
              {tile.items.slice(0, 4).map((item) => (
                <span key={item.id} className="w-14 shrink-0">
                  <PosterImage alt="" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w185')} title={displayTitle(item.title, item.year)} />
                </span>
              ))}
            </span>
          </Link>
        ))}
        <div className="rounded-md border border-(--brass)/40 p-4 md:col-span-12">
          <p className="font-['Cinzel',serif] text-3xl tabular-nums">{stats.total}</p>
          <p className="text-sm text-(--ink-muted)">{stats.finished} finished{stats.average === null ? '' : ` · my average ${stats.average}`}</p>
        </div>
        <button type="button" className="rounded-md border border-(--brass)/40 p-4 text-left md:col-span-4" onClick={() => setTonight(true)}>
          <span className="font-['Cinzel',serif]">Pick for tonight</span>
          <span className="mt-1 block text-sm text-(--ink-muted)">{pool.length === 0 ? 'Nothing matches' : `${pool.length} to pick from`}</span>
        </button>
      </section>
      <div className="md:hidden">
        {tiles.map((tile) => (
          <section key={`${tile.id}-rail`} className="edge pb-4">
            <h2 className="mb-2 font-['Cinzel',serif] text-sm">{tile.title}</h2>
            <Rail label={tile.title}>
              {tile.items.slice(0, 8).map((item) => (
                <Link key={item.id} to={tile.href} data-rail-card="true" className="w-[clamp(4.5rem,18cqi,7.5rem)] shrink-0 snap-start">
                  <PosterImage alt="" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w185')} title={displayTitle(item.title, item.year)} />
                </Link>
              ))}
            </Rail>
          </section>
        ))}
      </div>
      {tonight ? <TonightModal lists={data.lists} onClose={() => { setChoice(readTonight(data.lists)); setTonight(false) }} /> : null}
    </main>
  )
}
