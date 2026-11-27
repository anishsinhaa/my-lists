import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeletons } from '@/components/common/Skeletons'
import { BRAND } from '@/config/branding'
import { Button } from '@/design/Button'
import { LogoMark } from '@/design/LogoMark'
import { PosterImage } from '@/components/common/PosterImage'
import { thumbnailUrl } from '@/design/archive'
import { useAuth, useCanEdit } from '@/features/auth/AuthContext'
import { useLists } from '@/features/data/useLists'
import { usePicksVisibility } from '@/features/settings/useSettings'
import { DUR, EASE, fadeIn } from '@/themes/motion'
import { formatRating } from '@/lib/rating'
import { LIST_IDS, LIST_KIND } from '@/types/lists'
import { displayTitle } from '@/lib/displayTitle'
import { WallBoard } from './WallBoard'
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
  const canEdit = useCanEdit()
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
          {collage.map((item) => <PosterImage key={item.id} alt="" byline={item.creator ?? ''} className="h-40 w-full" fit="fill" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w185')} title={displayTitle(item.title, item.year)} />)}
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
            {canEdit && picks.any ? <Button size="lg" variant="ghost" className="text-[#f4ead8]" onClick={() => void navigate('/picks')}>Picks</Button> : null}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className="inline-flex cursor-not-allowed rounded-full focus-visible:outline-2 focus-visible:outline-(--brass)"
                    onPointerUp={(event) => {
                      if (event.pointerType === 'touch') toast.info('Coming soon')
                    }}
                  >
                    <button type="button" disabled aria-disabled="true" title="Coming soon" className="pointer-events-none inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-full border border-(--brass) bg-(--surface) px-4 text-sm text-(--ink-muted) opacity-50">
                      <Plus aria-hidden="true" className="size-4" />
                      Add
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <GlobalSearch />
        </div>
      </section>
      <WallBoard tiles={tiles} />
      <section className="edge grid w-full gap-4 pb-4 md:grid-cols-12">
        <div className="rounded-md border border-(--brass)/40 p-4 md:col-span-12">
          <p className="font-['Cinzel',serif] text-3xl tabular-nums">{stats.total}</p>
          <p className="text-sm text-(--ink-muted)">{stats.finished} finished{stats.average === null ? '' : ` · my average ${formatRating(stats.average)}`}</p>
        </div>
        <button type="button" className="rounded-md border border-(--brass)/40 p-4 text-left md:col-span-4" onClick={() => setTonight(true)}>
          <span className="font-['Cinzel',serif]">Pick for tonight</span>
          <span className="mt-1 block text-sm text-(--ink-muted)">{pool.length === 0 ? 'Nothing matches' : `${pool.length} to pick from`}</span>
        </button>
      </section>
      {tonight ? <TonightModal lists={data.lists} onClose={() => { setChoice(readTonight(data.lists)); setTonight(false) }} /> : null}
    </main>
  )
}
