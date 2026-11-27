import { useEffect } from 'react'
import { motion } from 'motion/react'
import { EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLists } from '@/features/data/useLists'
import { PICK_STATUS_OPTIONS, PICK_SWIPE_MAP } from '@/types/picks'
import type { PicksId } from '@/types/lists'
import { PickCard } from './PickCard'
import { usePicksQueue } from './usePicksQueue'

export function PickDeck({ picksId }: { picksId: PicksId }) {
  const { data } = useLists()
  const queue = usePicksQueue(picksId)
  const swipe = PICK_SWIPE_MAP[picksId]
  const options = PICK_STATUS_OPTIONS[picksId]
  const existing = data?.lists[queue.current?.targetList ?? 'movies'].find((item) => item.titleKey === queue.current?.titleKey)?.status
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') queue.act({ type: 'status', status: swipe.right })
      if (event.key === 'ArrowUp') queue.act({ type: 'status', status: swipe.up })
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 's') queue.act({ type: 'skip' })
      const index = Number(event.key) - 1
      const status = options[index]
      if (status !== undefined) queue.act({ type: 'status', status })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options, queue, swipe.right, swipe.up])
  if (queue.current === null) return <p className="p-6 text-sm">No picks left in this session.</p>
  return (
    <div className="space-y-4">
      <div className="relative mx-auto max-w-sm">
        {queue.upcoming.slice().reverse().map((item) => <div key={item.id} className="absolute inset-x-3 top-2 opacity-60"><PickCard item={item} /></div>)}
        <motion.div drag dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} onDragEnd={(_, info) => {
          if (info.offset.x > 120 || info.velocity.x > 500) queue.act({ type: 'status', status: swipe.right })
          else if (info.offset.y < -120 || info.velocity.y < -500) queue.act({ type: 'status', status: swipe.up })
          else if (info.offset.x < -120 || info.velocity.x < -500) queue.act({ type: 'skip' })
        }}>
          <PickCard existing={existing} item={queue.current} />
        </motion.div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((status) => <Button key={status} className="min-h-14" type="button" onClick={() => queue.act({ type: 'status', status })}>{status}</Button>)}
      </div>
      <Button type="button" variant="outline" className="min-h-14 w-full" onClick={() => queue.act({ type: 'skip' })}><EyeOff /> Skip for now</Button>
      <p className="text-center text-xs text-(--ink-muted)">Hides until next session. {queue.remaining} left. {queue.syncing > 0 ? 'Saving…' : ''}</p>
      <Button type="button" variant="ghost" disabled={!queue.canUndo} onClick={queue.undo}>Undo</Button>
      {queue.lastError !== null ? <p className="text-sm">{queue.lastError}</p> : null}
    </div>
  )
}
