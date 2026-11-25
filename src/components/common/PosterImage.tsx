import { useState } from 'react'
import { motion } from 'motion/react'
import type { MediaKind } from '@/types/lists'
import { FallbackCover } from '@/components/FallbackCover'

export function PosterImage({ src, alt, title, byline = '', aspect = '2/3', className = '', priority = false, kind = 'other' }: { src: string | null; alt: string; title: string; byline?: string; aspect?: '2/3' | '1/1'; className?: string; priority?: boolean; kind?: MediaKind }) {
  const [failed, setFailed] = useState(false)
  const ratio = aspect === '1/1' ? 'aspect-square' : 'aspect-[2/3]'
  const showImage = src !== null && src.length > 0 && !failed
  return (
    <div className={`relative overflow-hidden bg-(--surface-2) ${ratio} ${className}`}>
      {showImage ? (
        <motion.img
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.28 }}
          loading={priority ? 'eager' : 'lazy'}
          src={src}
          onError={() => setFailed(true)}
        />
      ) : (
        <FallbackCover className="absolute inset-0" kind={kind} title={title} byline={byline} />
      )}
    </div>
  )
}
