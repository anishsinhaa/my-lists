import { PosterImage } from '@/components/common/PosterImage'
import { RatingBadge } from '@/components/common/RatingBadge'
import { StatusChip } from '@/components/common/StatusChip'
import { externalRatingLabel } from '@/lib/rating'
import { LIST_KIND } from '@/types/lists'
import type { MediaItem } from '@/types/media'
import { AnimeCard } from '../cards/AnimeCard'
import { BookCard } from '../cards/BookCard'
import { GameCard } from '../cards/GameCard'
import { CardCaption, MovieCard } from '../cards/MovieCard'
import { SeriesCard } from '../cards/SeriesCard'

export interface PosterCardProps {
  item: MediaItem
  index: number
  variant?: 'default'
  onOpen?: (item: MediaItem) => void
}

export function PosterCard(props: PosterCardProps) {
  const { item } = props
  if (item.listId === 'movies') return <MovieCard {...props} />
  if (item.listId === 'series') return <SeriesCard {...props} />
  if (item.listId === 'anime') return <AnimeCard {...props} />
  if (item.listId === 'games') return <GameCard {...props} />
  if (item.listId === 'books') return <BookCard {...props} />
  return (
    <button type="button" className="block w-full text-left" onClick={() => props.onOpen?.(item)}>
      <span className="relative block">
        <PosterImage alt="" kind={LIST_KIND[item.listId]} src={item.poster} title={item.title} />
        <span className="absolute top-2 left-2"><StatusChip size="sm" status={item.status} /></span>
      </span>
      <CardCaption item={item} />
      <RatingBadge externalLabel={externalRatingLabel(item.listId)} externalRating={item.imdbRating} myRating={item.myRating} />
    </button>
  )
}
