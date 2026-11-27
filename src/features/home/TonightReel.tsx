import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { PosterImage } from '@/components/common/PosterImage'
import { thumbnailUrl } from '@/design/archive'
import { displayTitle } from '@/lib/displayTitle'
import { LIST_KIND } from '@/types/lists'
import type { MediaItem } from '@/types/media'

function frameUrls(frames: MediaItem[]): string[] {
  return frames.flatMap((item) => {
    const url = thumbnailUrl(item.poster, 'w342')
    return url === null || url.length === 0 ? [] : [url]
  })
}

function preload(urls: string[]): Promise<void> {
  return Promise.all(urls.map((url) => new Promise<void>((resolve) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = url
  }))).then(() => undefined)
}

export function TonightReel({ frames, spinning, onLand }: {
  frames: MediaItem[]
  spinning: boolean
  onLand: (winner: MediaItem) => void
}) {
  const winner = frames[frames.length - 1]
  const urls = frameUrls(frames)
  const key = `${frames.map((item) => item.id).join('|')}:${spinning ? 'spin' : 'still'}`
  const [seen, setSeen] = useState(key)
  const [ready, setReady] = useState(urls.length === 0 || !spinning)
  const landed = useRef(false)
  const onLandRef = useRef(onLand)
  const spinningRef = useRef(spinning)
  const framesRef = useRef(frames)
  const keyRef = useRef(key)

  if (seen !== key) {
    setSeen(key)
    setReady(urls.length === 0 || !spinning)
  }

  useEffect(() => {
    onLandRef.current = onLand
    spinningRef.current = spinning
    framesRef.current = frames
    if (keyRef.current !== key) {
      keyRef.current = key
      landed.current = false
    }
  }, [frames, key, onLand, spinning])

  const urlKey = urls.join('\n')
  useEffect(() => {
    if (!spinning || urlKey.length === 0) return undefined
    let cancelled = false
    void preload(urlKey.split('\n')).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => { cancelled = true }
  }, [spinning, urlKey])

  const finish = useCallback(() => {
    if (!spinningRef.current || landed.current) return
    const landedOn = framesRef.current[framesRef.current.length - 1]
    if (landedOn === undefined) return
    landed.current = true
    onLandRef.current(landedOn)
  }, [])

  if (winner === undefined) return null
  const shown = spinning ? frames : [winner]
  const offset = `-${((shown.length - 1) / shown.length) * 100}%`
  const moving = spinning && ready && shown.length > 1

  return (
    <div className="relative mx-auto aspect-2/3 w-44 overflow-hidden rounded-(--radius) shadow-(--shadow-card)">
      <motion.div
        className="flex flex-col"
        data-spinning={moving ? 'true' : 'false'}
        initial={{ y: '0%', filter: 'blur(0px)', scale: 1 }}
        animate={moving
          ? { y: offset, filter: ['blur(8px)', 'blur(0px)'], scale: [1, 1.04, 1] }
          : { y: '0%', filter: 'blur(0px)', scale: 1 }}
        transition={moving ? { duration: 1.8, ease: [0.12, 0.8, 0.2, 1] } : { duration: 0.2 }}
        onAnimationComplete={finish}
      >
        {shown.map((item, index) => (
          <div key={`${item.id}-${index}`} className="aspect-2/3 w-44 shrink-0">
            <PosterImage alt="" byline={item.creator ?? ''} className="h-full w-full" fit="fill" kind={LIST_KIND[item.listId]} src={thumbnailUrl(item.poster, 'w342')} title={displayTitle(item.title, item.year)} />
          </div>
        ))}
      </motion.div>
    </div>
  )
}
