import { motion } from 'motion/react'
import { PosterImage } from '@/components/common/PosterImage'
import { RatingBadge } from '@/components/common/RatingBadge'
import { externalRatingLabel } from '@/lib/rating'
import type { PosterCardProps } from '../views/PosterCard'
import { CardCaption } from './MovieCard'

export function GameCard({ item, index, onOpen }: PosterCardProps) {
  return (
    <button type="button" className="block w-full text-left" onClick={() => onOpen?.(item)}>
      <motion.span
        className="chamfer scanlines relative block border border-accent hover:shadow-(--shadow-card)"
        initial={index < 12 ? { opacity: 0.6 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12, times: [0, 0.5, 1] }}
      >
        <PosterImage alt="" kind="game" src={item.poster} title={item.title} />
        {item.platform !== null ? <span className="absolute top-2 left-2 bg-(--surface) px-1 text-xs">{item.platform}</span> : null}
        <span className="absolute bottom-2 left-2"><RatingBadge externalLabel={externalRatingLabel('games')} externalRating={item.imdbRating} myRating={item.myRating} /></span>
      </motion.span>
      <CardCaption item={item} />
    </button>
  )
}
