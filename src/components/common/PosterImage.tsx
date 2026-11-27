import { useState } from 'react'
import { motion } from 'motion/react'
import type { MediaKind } from '@/types/lists'
import { FallbackCover } from '@/components/FallbackCover'

export function PosterImage({ src, alt, title, byline = '', aspect = '2/3', className = '', priority = false, kind = 'other', fit = 'poster' }: {
  src: string | null
  alt: string
  title: string
  byline?: string
  aspect?: '2/3' | '1/1'
  className?: string
  priority?: boolean
  kind?: MediaKind
  fit?: 'poster' | 'fill'
}) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [seen, setSeen] = useState(src)
  if (src !== seen) {
    setSeen(src)
    setFailed(false)
    setLoaded(false)
  }
  const ratio = fit === 'fill' ? 'h-full w-full' : aspect === '1/1' ? 'aspect-square' : 'aspect-[2/3]'
  const showImage = src !== null && src.length > 0 && !failed
  return (
    <div className={`relative overflow-hidden bg-(--surface-2) ${ratio} ${className}`}>
      <FallbackCover className="absolute inset-0" kind={kind} title={title} byline={byline} />
      {showImage ? (
        <motion.img
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.28 }}
          loading={priority ? 'eager' : 'lazy'}
          src={src}
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth <= 1) {
              setFailed(true)
              return
            }
            setLoaded(true)
          }}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  )
}
