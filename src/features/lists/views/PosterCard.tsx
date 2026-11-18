import { Heart } from 'lucide-react'
import { PosterImage } from '@/components/common/PosterImage'
import { RatingBadge } from '@/components/common/RatingBadge'
import { StatusChip } from '@/components/common/StatusChip'
import { StatusBadge } from '@/design/StatusBadge'
import { visibleRating } from '@/design/archive'
import { displayTitle } from '@/lib/displayTitle'
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

function themed(props: PosterCardProps) {
  const { item } = props
  if (item.listId === 'movies') return <MovieCard {...props} />
  if (item.listId === 'series') return <SeriesCard {...props} />
  if (item.listId === 'anime') return <AnimeCard {...props} />
  if (item.listId === 'games') return <GameCard {...props} />
  if (item.listId === 'books') return <BookCard {...props} />
  return (
    <button type="button" className={`block w-full cursor-pointer text-left ${item.listId === 'curious' ? 'curious-row' : 'other-row'}`} onClick={() => props.onOpen?.(item)}>
      <span className="relative block">
        <PosterImage alt="" kind={LIST_KIND[item.listId]} src={item.poster} title={displayTitle(item.title, item.year)} />
        <span className="absolute top-2 left-2"><StatusChip size="sm" status={item.status} /></span>
      </span>
      <CardCaption item={item} />
      <RatingBadge externalLabel={externalRatingLabel(item.listId)} externalRating={item.imdbRating} myRating={item.myRating} />
    </button>
  )
}

function FavouriteMark({ side }: { side: 'left' | 'right' }) {
  return (
    <span className={`pointer-events-none absolute top-2 z-10 inline-flex size-6 items-center justify-center rounded-full bg-black/70 ${side === 'left' ? 'left-2' : 'right-2'}`}>
      <Heart aria-hidden="true" className="size-3.5 fill-(--accent) text-(--accent)" />
      <span className="sr-only">Favourite</span>
    </span>
  )
}

export function PosterCard(props: PosterCardProps) {
  const card = themed(props)
  const anime = props.item.listId === 'anime'
  const rating = visibleRating(props.item)
  return (
    <div className="relative">
      {card}
      {props.item.favourite ? <FavouriteMark side={anime ? 'left' : 'right'} /> : null}
      {anime ? null : <span className="pointer-events-none absolute top-2 left-2 z-10"><StatusBadge listId={props.item.listId} status={props.item.status} /></span>}
      {anime || (rating.my === null && rating.external === null) ? null : (
        <span className="absolute right-2 bottom-16 z-10 rounded-md bg-black/75 px-2 py-1 text-left text-xs leading-tight text-white">
          {rating.external === null ? null : <span className="block">{rating.externalLabel} {rating.external}</span>}
          {rating.my === null ? null : <span className="block">My rating {rating.my}</span>}
        </span>
      )}
    </div>
  )
}
